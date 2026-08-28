use axum::{
    Json, Router,
    extract::{Query, State},
    http::header,
    response::IntoResponse,
    routing::get,
};
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;

pub fn api_router(state: Arc<RwLock<Value>>) -> Router {
    Router::new()
        .route("/api/cv", get(get_cv))
        .route("/api/cv.bson", get(get_cv_bson))
        .route("/api/cv.pdf", get(get_cv_pdf))
        .with_state(state)
        .layer(tower_http::cors::CorsLayer::permissive())
}

async fn get_cv_pdf(
    State(cv): State<Arc<RwLock<Value>>>,
    Query(query): Query<CvQuery>,
) -> impl IntoResponse {
    let data = cv.read().await.clone();
    let filtered = filter_cv(data, &query);
    let clean = transform_for_typst(filtered);

    // 1. Save filtered JSON to a temp file
    let uuid = uuid::Uuid::new_v4();
    let temp_json_fs = format!("build/cv_filtered_{}.json", uuid);
    let temp_json_typst = format!("/build/cv_filtered_{}.json", uuid); // root-relative for typst
    let _ = std::fs::write(&temp_json_fs, serde_json::to_string(&clean).unwrap());

    // 2. Compile via CLI using the main template
    let temp_pdf = format!("build/cv_out_{}.pdf", uuid);

    // the working directory for the api is usually the project root or src/rust
    // We assume we are running from project root (since devenv shell does)
    let output = std::process::Command::new("typst")
        .arg("compile")
        .arg("--root")
        .arg(".")
        .arg("--input")
        .arg(format!("cv_data_path={}", temp_json_typst))
        .arg("src/typst/cv_template.typ")
        .arg(&temp_pdf)
        .output()
        .expect("Failed to execute typst");

    let _ = std::fs::write(format!("build/typst_error_{}.txt", uuid), &output.stderr);
    let _ = std::fs::write(format!("build/typst_stdout_{}.txt", uuid), &output.stdout);

    let pdf = std::fs::read(&temp_pdf).unwrap_or_default();

    // cleanup
    let _ = std::fs::remove_file(&temp_json_fs);
    let _ = std::fs::remove_file(&temp_pdf);

    (
        [
            (header::CONTENT_TYPE, "application/pdf"),
            (
                header::CONTENT_DISPOSITION,
                "attachment; filename=\"Cian_Hughes_CV.pdf\"",
            ),
        ],
        pdf,
    )
}

use serde_json::Map;

#[derive(Deserialize)]
pub struct CvQuery {
    exclude: Option<String>,
    profile: Option<String>,
}

/// Transform the raw HDF5/API JSON into the "clean" schema that the Typst
/// template (`clean_print_cv.typ`) expects.  This mirrors the Python
/// `generate_static.py` transformation so the same template works for both
/// the local CLI and the server-side PDF endpoint.
fn transform_for_typst(data: Value) -> Value {
    let map = match data.as_object() {
        Some(m) => m,
        None => return data,
    };

    let mut clean = Map::new();

    // ── personal ──────────────────────────────────────────────────────
    if let Some(pi) = map.get("personal_info").and_then(|v| v.as_object()) {
        let s = |k: &str| -> Value {
            pi.get(k)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .into()
        };
        let city = pi.get("city").and_then(|v| v.as_str()).unwrap_or("");
        let country = pi.get("country").and_then(|v| v.as_str()).unwrap_or("");
        let location = format!("{}, {}", city, country)
            .trim_matches(|c: char| c == ',' || c == ' ')
            .to_string();

        let mut personal = Map::new();
        personal.insert("name".into(), s("name"));
        personal.insert("title".into(), s("title"));
        personal.insert("email".into(), s("email"));
        personal.insert("phone".into(), s("phone"));
        personal.insert("location".into(), Value::String(location));
        personal.insert("linkedin".into(), Value::String(String::new()));
        personal.insert("github".into(), Value::String(String::new()));
        personal.insert("website".into(), Value::String(String::new()));
        personal.insert("scholar".into(), Value::String(String::new()));
        personal.insert("orcid".into(), s("orcid"));

        if let Some(links) = pi.get("links").and_then(|v| v.as_array()) {
            for link in links {
                let name = link
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_lowercase();
                let url = link
                    .get("url")
                    .cloned()
                    .unwrap_or(Value::String(String::new()));
                if name.contains("github") {
                    personal.insert("github".into(), url);
                } else if name.contains("linkedin") {
                    personal.insert("linkedin".into(), url);
                } else if name.contains("scholar") {
                    personal.insert("scholar".into(), url);
                } else if name.contains("blog") {
                    personal.insert("website".into(), url);
                }
            }
        }

        clean.insert("personal".into(), Value::Object(personal));

        // summary (profile text)
        let profile = pi
            .get("profile")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        clean.insert("summary".into(), Value::String(profile.to_string()));
    }

    // ── skills ────────────────────────────────────────────────────────
    if let Some(skills) = map.get("skills").and_then(|v| v.as_array()) {
        let mut skills_map: Vec<(String, Vec<String>)> = Vec::new();
        for s in skills {
            let cat = s
                .get("category")
                .and_then(|v| v.as_str())
                .unwrap_or("Skills")
                .to_string();
            let desc = s
                .get("description")
                .or_else(|| s.get("name"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if let Some(entry) = skills_map.iter_mut().find(|(k, _)| *k == cat) {
                entry.1.push(desc);
            } else {
                skills_map.push((cat, vec![desc]));
            }
        }
        let arr: Vec<Value> = skills_map
            .into_iter()
            .map(|(cat, items)| {
                serde_json::json!({"category": cat, "items": items})
            })
            .collect();
        clean.insert("skills".into(), Value::Array(arr));
    }

    // ── experience ────────────────────────────────────────────────────
    if let Some(experience) = map.get("experience").and_then(|v| v.as_array()) {
        let arr: Vec<Value> = experience
            .iter()
            .map(|e| {
                serde_json::json!({
                    "role": e.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                    "company": e.get("organization").and_then(|v| v.as_str()).unwrap_or(""),
                    "location": e.get("location").and_then(|v| v.as_str()).unwrap_or(""),
                    "period": e.get("date").and_then(|v| v.as_str()).unwrap_or(""),
                    "highlights": e.get("bullets").cloned().unwrap_or(Value::Array(vec![])),
                })
            })
            .collect();
        clean.insert("experience".into(), Value::Array(arr));
    } else if let Some(employment) = map.get("employment").and_then(|v| v.as_array()) {
        let arr: Vec<Value> = employment
            .iter()
            .map(|e| {
                let start = e
                    .get("start_date")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let end = e
                    .get("end_date")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let period = if end.is_empty() {
                    format!("{} - Present", start)
                } else {
                    format!("{} - {}", start, end)
                };
                serde_json::json!({
                    "role": e.get("role").and_then(|v| v.as_str()).unwrap_or(""),
                    "company": e.get("organization").and_then(|v| v.as_str()).unwrap_or(""),
                    "location": e.get("department").and_then(|v| v.as_str()).unwrap_or(""),
                    "period": period,
                    "highlights": [],
                })
            })
            .collect();
        clean.insert("experience".into(), Value::Array(arr));
    }

    // ── education ─────────────────────────────────────────────────────
    if let Some(education) = map.get("education").and_then(|v| v.as_array()) {
        let arr: Vec<Value> = education
            .iter()
            .map(|e| {
                serde_json::json!({
                    "degree": e.get("degree").and_then(|v| v.as_str()).unwrap_or(""),
                    "institution": e.get("institution").and_then(|v| v.as_str()).unwrap_or(""),
                    "location": "",
                    "period": e.get("date").and_then(|v| v.as_str()).unwrap_or(""),
                    "details": e.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                })
            })
            .collect();
        clean.insert("education".into(), Value::Array(arr));
    }

    // ── projects ──────────────────────────────────────────────────────
    if let Some(projects) = map.get("projects").and_then(|v| v.as_array()) {
        let arr: Vec<Value> = projects
            .iter()
            .map(|p| {
                serde_json::json!({
                    "name": p.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                    "url": p.get("url").and_then(|v| v.as_str()).unwrap_or(""),
                    "description": p.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                })
            })
            .collect();
        clean.insert("projects".into(), Value::Array(arr));
    }

    // ── service ───────────────────────────────────────────────────────
    if let Some(service) = map.get("service").and_then(|v| v.as_array()) {
        let arr: Vec<Value> = service
            .iter()
            .map(|s| {
                serde_json::json!({
                    "role": s.get("role").and_then(|v| v.as_str()).unwrap_or(""),
                    "organization": s.get("organization").and_then(|v| v.as_str()).unwrap_or(""),
                    "date": s.get("date").and_then(|v| v.as_str()).unwrap_or(""),
                    "description": s.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                })
            })
            .collect();
        clean.insert("service".into(), Value::Array(arr));
    }

    // ── certifications ────────────────────────────────────────────────
    if let Some(certs) = map.get("certifications").and_then(|v| v.as_array()) {
        let arr: Vec<Value> = certs
            .iter()
            .map(|c| {
                serde_json::json!({
                    "name": c.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                    "issuer": c.get("issuer").and_then(|v| v.as_str()).unwrap_or(""),
                    "year": c.get("date").and_then(|v| v.as_str()).unwrap_or(""),
                    "url": c.get("url").and_then(|v| v.as_str()).unwrap_or(""),
                })
            })
            .collect();
        clean.insert("certifications".into(), Value::Array(arr));
    }

    // ── conferences ───────────────────────────────────────────────────
    if let Some(confs) = map.get("conferences").and_then(|v| v.as_array()) {
        let arr: Vec<Value> = confs
            .iter()
            .map(|c| {
                serde_json::json!({
                    "name": c.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                    "role": c.get("role").and_then(|v| v.as_str()).unwrap_or(""),
                    "date": c.get("date").and_then(|v| v.as_str()).unwrap_or(""),
                })
            })
            .collect();
        clean.insert("conferences".into(), Value::Array(arr));
    }

    // ── languages ─────────────────────────────────────────────────────
    if let Some(langs) = map.get("languages").and_then(|v| v.as_array()) {
        let arr: Vec<Value> = langs
            .iter()
            .map(|l| {
                serde_json::json!({
                    "name": l.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                    "proficiency": l.get("proficiency").and_then(|v| v.as_str()).unwrap_or(""),
                })
            })
            .collect();
        clean.insert("languages".into(), Value::Array(arr));
    }

    // ── publications ──────────────────────────────────────────────────
    if let Some(pubs) = map.get("publications").and_then(|v| v.as_array()) {
        let arr: Vec<Value> = pubs
            .iter()
            .map(|p| {
                serde_json::json!({
                    "title": p.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                    "year": p.get("year").and_then(|v| v.as_str()).unwrap_or(""),
                    "journal": p.get("journal").and_then(|v| v.as_str()).unwrap_or(""),
                    "doi": p.get("doi").and_then(|v| v.as_str()).unwrap_or(""),
                    "url": p.get("url").and_then(|v| v.as_str()).unwrap_or(""),
                })
            })
            .collect();
        clean.insert("publications".into(), Value::Array(arr));
    }

    Value::Object(clean)
}

fn filter_cv(mut data: Value, query: &CvQuery) -> Value {
    if let Value::Object(ref mut map) = data {
        // Handle exclusions
        if let Some(exclude_str) = &query.exclude {
            for section in exclude_str.split(',') {
                map.remove(section.trim());
            }
        }

        // Handle profile selection
        let profile_name = query.profile.as_deref().unwrap_or("general");

        if let Some(personal_info) = map.get_mut("personal_info") {
            if let Some(pi_map) = personal_info.as_object_mut() {
                if let Some(profiles) = pi_map.get("profiles") {
                    if let Some(selected_profile) = profiles.get(profile_name) {
                        if let Some(text) = selected_profile.get("text") {
                            pi_map.insert("profile".to_string(), text.clone());
                        }
                    }
                }
            }
        }
    }
    data
}

async fn get_cv(State(cv): State<Arc<RwLock<Value>>>, Query(query): Query<CvQuery>) -> Json<Value> {
    let data = cv.read().await.clone();
    Json(filter_cv(data, &query))
}

async fn get_cv_bson(
    State(cv): State<Arc<RwLock<Value>>>,
    Query(query): Query<CvQuery>,
) -> impl IntoResponse {
    let data = cv.read().await.clone();
    let filtered = filter_cv(data, &query);
    let bytes = bson::to_vec(&filtered).unwrap_or_default();
    ([(header::CONTENT_TYPE, "application/bson")], bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_api_router_returns_cv() {
        let dummy_cv = serde_json::json!({
            "personal_info": {
                "name": "Test User",
                "email": "test@example.com"
            }
        });

        let state = Arc::new(RwLock::new(dummy_cv.clone()));
        let app = api_router(state);

        let request = Request::builder()
            .uri("/api/cv")
            .method("GET")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body_json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(body_json, dummy_cv);
    }

    #[tokio::test]
    async fn test_api_router_returns_bson() {
        let dummy_cv = serde_json::json!({
            "personal_info": {
                "name": "Test User",
                "email": "test@example.com"
            }
        });

        let state = Arc::new(RwLock::new(dummy_cv.clone()));
        let app = api_router(state);

        let request = Request::builder()
            .uri("/api/cv.bson")
            .method("GET")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let expected_bson = bson::to_vec(&dummy_cv).unwrap();

        assert_eq!(body.as_ref(), expected_bson.as_slice());
    }
}
