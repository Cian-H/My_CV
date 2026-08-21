use anyhow::{Context, Result};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::api::api_router;

pub async fn run(bind: &str, port: u16, state: Arc<RwLock<serde_json::Value>>) -> Result<()> {
    let app = api_router(state);
    let addr: SocketAddr = format!("{}:{}", bind, port)
        .parse()
        .with_context(|| format!("Failed to parse bind address '{}:{}'", bind, port))?;

    println!("CV API listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .with_context(|| format!("Failed to bind to TCP address {}", addr))?;

    axum::serve(listener, app)
        .await
        .context("Server crashed unexpectedly")?;

    Ok(())
}
