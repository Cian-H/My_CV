use crate::typst_world::MinimalWorld;
use axum::{
    Json, Router,
    extract::{Query, State},
    http::header,
    response::IntoResponse,
    routing::get,
};
use minijinja::Environment;
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

    // 1. Template
    let mut env = Environment::new();
    let tmpl_str = include_str!("../templates/cv.typ");
    env.add_template("cv", tmpl_str).unwrap();
    let tmpl = env.get_template("cv").unwrap();
    let rendered = tmpl
        .render(&filtered)
        .unwrap_or_else(|e| format!("Template error: {}", e));

    // 2. Compile Typst
    let world = MinimalWorld::new(rendered);
    let document = typst::compile(&world).output.unwrap();
    let pdf = typst_pdf::pdf(&document, &typst_pdf::PdfOptions::default()).unwrap();

    ([(header::CONTENT_TYPE, "application/pdf")], pdf)
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
