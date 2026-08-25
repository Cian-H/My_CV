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

    // 1. Save filtered JSON to a temp file
    let uuid = uuid::Uuid::new_v4();
    let temp_json_fs = format!("build/cv_filtered_{}.json", uuid);
    let temp_json_typst = format!("/build/cv_filtered_{}.json", uuid); // root-relative for typst
    let _ = std::fs::write(&temp_json_fs, serde_json::to_string(&filtered).unwrap());

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

#[derive(Deserialize)]
pub struct CvQuery {
    exclude: Option<String>,
}

fn filter_cv(mut data: Value, query: &CvQuery) -> Value {
    if let Some(exclude_str) = &query.exclude {
        if let Value::Object(ref mut map) = data {
            for section in exclude_str.split(',') {
                map.remove(section.trim());
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
