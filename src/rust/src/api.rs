use axum::{Json, Router, extract::State, http::header, response::IntoResponse, routing::get};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;

pub fn api_router(state: Arc<RwLock<Value>>) -> Router {
    Router::new()
        .route("/api/cv", get(get_cv))
        .route("/api/cv.bson", get(get_cv_bson))
        .with_state(state)
        .layer(tower_http::cors::CorsLayer::permissive())
}

async fn get_cv(State(cv): State<Arc<RwLock<Value>>>) -> Json<Value> {
    let data = cv.read().await.clone();
    Json(data)
}

async fn get_cv_bson(State(cv): State<Arc<RwLock<Value>>>) -> impl IntoResponse {
    let data = cv.read().await.clone();
    let bytes = bson::to_vec(&data).unwrap_or_default();
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
