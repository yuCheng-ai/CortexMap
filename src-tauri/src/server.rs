use axum::{
    routing::{get, post},
    Json, Router, Extension,
};
use std::net::SocketAddr;
use sqlx::SqlitePool;
use crate::models::{CortexNode, Commit};
use serde_json::json;

pub async fn start_server(pool: SqlitePool) {
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/nodes", get(get_nodes))
        .layer(Extension(pool));

    let addr = SocketAddr::from(([127, 0, 0, 1], 1357));
    println!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "CortexMap API is running"
}

async fn get_nodes(Extension(pool): Extension<SqlitePool>) -> Json<serde_json::Value> {
    // Simple mock for now, will implement actual DB query later
    Json(json!({"status": "ok", "message": "Endpoint ready"}))
}
