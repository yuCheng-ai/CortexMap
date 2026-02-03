use axum::{
    routing::{get, post},
    Json, Router, Extension,
    extract::Path,
    http::{StatusCode, Method, HeaderValue},
};
use std::net::SocketAddr;
use sqlx::SqlitePool;
use crate::models::{CortexNode, CortexEdge, Commit, NodeRole};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tower_http::cors::CorsLayer;
use uuid::Uuid;
use chrono::Utc;

#[derive(Deserialize, Serialize)]
struct StatePayload {
    nodes: Vec<CortexNode>,
    edges: Vec<CortexEdge>,
}

#[derive(Deserialize)]
struct CreateCommitPayload {
    message: String,
    agent_id: String,
}

pub async fn start_server(pool: SqlitePool) {
    let cors = CorsLayer::new()
        .allow_origin("http://localhost:1430".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/state", get(get_state).post(save_state))
        .route("/commits", get(get_commits).post(create_commit))
        .route("/commits/:id/restore", post(restore_commit))
        .route("/commits/:id/snapshot", get(get_commit_snapshot))
        .layer(cors)
        .layer(Extension(pool));

    let addr = SocketAddr::from(([127, 0, 0, 1], 1357));
    println!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "CortexMap API is running"
}

async fn get_state(Extension(pool): Extension<SqlitePool>) -> Json<Value> {
    let nodes_rows = sqlx::query("SELECT * FROM nodes").fetch_all(&pool).await;
    let edges_rows = sqlx::query("SELECT * FROM edges").fetch_all(&pool).await;

    if nodes_rows.is_err() || edges_rows.is_err() {
        return Json(json!({"error": "Failed to fetch state"}));
    }

    let nodes: Vec<CortexNode> = nodes_rows.unwrap().into_iter().map(|row| {
        use sqlx::Row;
        let metadata_str: Option<String> = row.get("metadata");
        let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
        
        let role_str: String = row.get("role");
        let role = match role_str.as_str() {
            "plan" => NodeRole::Plan,
            "memory" => NodeRole::Memory,
            "evidence" => NodeRole::Evidence,
            "execution" => NodeRole::Execution,
            "reflection" => NodeRole::Reflection,
            _ => NodeRole::Plan,
        };

        CortexNode {
            id: row.get("id"),
            text: row.get("text"),
            role,
            metadata,
            parent_id: row.get("parent_id"),
        }
    }).collect();

    let edges: Vec<CortexEdge> = edges_rows.unwrap().into_iter().map(|row| {
        use sqlx::Row;
        let metadata_str: Option<String> = row.get("metadata");
        let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());

        CortexEdge {
            id: row.get("id"),
            source: row.get("source"),
            target: row.get("target"),
            edge_type: row.get("edge_type"),
            metadata,
        }
    }).collect();

    Json(json!({
        "nodes": nodes,
        "edges": edges
    }))
}

async fn save_state(
    Extension(pool): Extension<SqlitePool>,
    Json(payload): Json<StatePayload>,
) -> StatusCode {
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
    };

    if sqlx::query("DELETE FROM nodes").execute(&mut *tx).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    if sqlx::query("DELETE FROM edges").execute(&mut *tx).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }

    for node in payload.nodes {
        let metadata_json = serde_json::to_string(&node.metadata).unwrap_or("{}".to_string());
        let role_str = serde_json::to_string(&node.role).unwrap_or("\"plan\"".to_string()).replace("\"", "");

        if sqlx::query(
            "INSERT INTO nodes (id, text, role, metadata, parent_id) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(node.id).bind(node.text).bind(role_str).bind(metadata_json).bind(node.parent_id)
        .execute(&mut *tx).await.is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }

    for edge in payload.edges {
        let metadata_json = serde_json::to_string(&edge.metadata).unwrap_or("{}".to_string());
        
        if sqlx::query(
            "INSERT INTO edges (id, source, target, edge_type, metadata) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(edge.id).bind(edge.source).bind(edge.target).bind(edge.edge_type).bind(metadata_json)
        .execute(&mut *tx).await.is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }

    if tx.commit().await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }

    StatusCode::OK
}

async fn get_commits(Extension(pool): Extension<SqlitePool>) -> Json<Value> {
    let rows = sqlx::query(
        "SELECT id, parent_id, agent_id, message, timestamp, patch_id FROM commits ORDER BY timestamp DESC"
    )
    .fetch_all(&pool)
    .await;

    match rows {
        Ok(rows) => {
            let commits: Vec<Commit> = rows.into_iter().map(|row| {
                use sqlx::Row;
                Commit {
                    id: row.get("id"),
                    parent_id: row.get("parent_id"),
                    agent_id: row.get("agent_id"),
                    message: row.get("message"),
                    timestamp: row.get("timestamp"),
                    patch_id: row.get("patch_id"),
                }
            }).collect();
            Json(json!(commits))
        },
        Err(e) => Json(json!({"error": e.to_string()}))
    }
}

async fn create_commit(
    Extension(pool): Extension<SqlitePool>,
    Json(payload): Json<CreateCommitPayload>,
) -> StatusCode {
    let nodes_rows = sqlx::query("SELECT * FROM nodes").fetch_all(&pool).await;
    let edges_rows = sqlx::query("SELECT * FROM edges").fetch_all(&pool).await;
    
    if nodes_rows.is_err() || edges_rows.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }

    let nodes: Vec<CortexNode> = nodes_rows.unwrap().into_iter().map(|row| {
        use sqlx::Row;
        let metadata_str: Option<String> = row.get("metadata");
        let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
        
        let role_str: String = row.get("role");
        let role = match role_str.as_str() {
            "plan" => NodeRole::Plan,
            "memory" => NodeRole::Memory,
            "evidence" => NodeRole::Evidence,
            "execution" => NodeRole::Execution,
            "reflection" => NodeRole::Reflection,
            _ => NodeRole::Plan,
        };

        CortexNode {
            id: row.get("id"),
            text: row.get("text"),
            role,
            metadata,
            parent_id: row.get("parent_id"),
        }
    }).collect();

    let edges: Vec<CortexEdge> = edges_rows.unwrap().into_iter().map(|row| {
        use sqlx::Row;
        let metadata_str: Option<String> = row.get("metadata");
        let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());

        CortexEdge {
            id: row.get("id"),
            source: row.get("source"),
            target: row.get("target"),
            edge_type: row.get("edge_type"),
            metadata,
        }
    }).collect();

    let state_json = json!({ "nodes": nodes, "edges": edges });
    
    let patch_id = Uuid::new_v4().to_string();
    let commit_id = Uuid::new_v4().to_string();
    
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
    };
    
    let ops_json = state_json.to_string();
    if sqlx::query("INSERT INTO patches (id, operations) VALUES (?, ?)")
        .bind(patch_id.clone())
        .bind(ops_json)
        .execute(&mut *tx).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    
    let parent_row = sqlx::query("SELECT id FROM commits ORDER BY timestamp DESC LIMIT 1")
        .fetch_optional(&mut *tx).await;
        
    let parent_id: Option<String> = match parent_row {
        Ok(Some(row)) => {
            use sqlx::Row;
            row.get("id")
        },
        _ => None,
    };
    
    if sqlx::query("INSERT INTO commits (id, parent_id, agent_id, message, timestamp, patch_id) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(commit_id)
        .bind(parent_id)
        .bind(payload.agent_id)
        .bind(payload.message)
        .bind(Utc::now())
        .bind(patch_id)
        .execute(&mut *tx).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    
    if tx.commit().await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    
    StatusCode::CREATED
}

async fn restore_commit(
    Extension(pool): Extension<SqlitePool>,
    Path(commit_id): Path<String>,
) -> StatusCode {
    let commit_row = sqlx::query("SELECT patch_id FROM commits WHERE id = ?")
        .bind(commit_id)
        .fetch_optional(&pool).await;

    let patch_id: String = match commit_row {
        Ok(Some(row)) => {
            use sqlx::Row;
            row.get("patch_id")
        },
        _ => return StatusCode::NOT_FOUND,
    };

    let patch_row = sqlx::query("SELECT operations FROM patches WHERE id = ?")
        .bind(patch_id)
        .fetch_optional(&pool).await;

    let operations_str: String = match patch_row {
        Ok(Some(row)) => {
            use sqlx::Row;
            row.get("operations")
        },
        _ => return StatusCode::NOT_FOUND,
    };

    let state: StatePayload = match serde_json::from_str(&operations_str) {
        Ok(s) => s,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
    };

    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
    };

    if sqlx::query("DELETE FROM nodes").execute(&mut *tx).await.is_err() { return StatusCode::INTERNAL_SERVER_ERROR; }
    if sqlx::query("DELETE FROM edges").execute(&mut *tx).await.is_err() { return StatusCode::INTERNAL_SERVER_ERROR; }

    for node in state.nodes {
        let metadata_json = serde_json::to_string(&node.metadata).unwrap_or("{}".to_string());
        let role_str = serde_json::to_string(&node.role).unwrap_or("\"plan\"".to_string()).replace("\"", "");

        if sqlx::query("INSERT INTO nodes (id, text, role, metadata, parent_id) VALUES (?, ?, ?, ?, ?)")
            .bind(node.id).bind(node.text).bind(role_str).bind(metadata_json).bind(node.parent_id)
            .execute(&mut *tx).await.is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }

    for edge in state.edges {
        let metadata_json = serde_json::to_string(&edge.metadata).unwrap_or("{}".to_string());
        
        if sqlx::query("INSERT INTO edges (id, source, target, edge_type, metadata) VALUES (?, ?, ?, ?, ?)")
            .bind(edge.id).bind(edge.source).bind(edge.target).bind(edge.edge_type).bind(metadata_json)
            .execute(&mut *tx).await.is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }

    if tx.commit().await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }

    StatusCode::OK
}

async fn get_commit_snapshot(
    Extension(pool): Extension<SqlitePool>,
    Path(commit_id): Path<String>,
) -> Json<Value> {
    let commit_row = sqlx::query("SELECT patch_id FROM commits WHERE id = ?")
        .bind(commit_id)
        .fetch_optional(&pool).await;

    let patch_id: String = match commit_row {
        Ok(Some(row)) => {
            use sqlx::Row;
            row.get("patch_id")
        },
        _ => return Json(json!({ "error": "Commit not found" })),
    };

    let patch_row = sqlx::query("SELECT operations FROM patches WHERE id = ?")
        .bind(patch_id)
        .fetch_optional(&pool).await;

    let operations_str: String = match patch_row {
        Ok(Some(row)) => {
            use sqlx::Row;
            row.get("operations")
        },
        _ => return Json(json!({ "error": "Snapshot not found" })),
    };

    match serde_json::from_str::<Value>(&operations_str) {
        Ok(state) => Json(state),
        Err(e) => Json(json!({ "error": e.to_string() })),
    }
}
