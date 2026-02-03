use serde::{Deserialize, Serialize};
use serde_json::Value;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum NodeRole {
    Plan,
    Execution,
    Memory,
    Evidence,
    Reflection,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CortexNode {
    pub id: String,
    pub text: String,
    pub role: NodeRole,
    pub metadata: Option<Value>,
    pub parent_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CortexEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub edge_type: String,
    pub metadata: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Commit {
    pub id: String,
    pub parent_id: Option<String>,
    pub agent_id: String,
    pub message: String,
    pub timestamp: DateTime<Utc>,
    pub patch_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Patch {
    pub id: String,
    pub operations: Value, // RFC 6902 JSON Patch
}
