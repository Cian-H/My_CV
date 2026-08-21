use axum::{Json, Router, routing::get, extract::State};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;

pub fn api_router(state: Arc<RwLock<Value>>) -> Router {
    Router::new()
        .route("/api/cv", get(get_cv))
        .with_state(state)
        .layer(tower_http::cors::CorsLayer::permissive())
}

async fn get_cv(State(cv): State<Arc<RwLock<Value>>>) -> Json<Value> {
    let data = cv.read().await.clone();
    Json(data)
}
