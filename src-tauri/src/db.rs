use sqlx::sqlite::{SqlitePoolOptions, SqliteConnectOptions};
use sqlx::SqlitePool;
use std::fs;
use std::path::Path;

pub async fn init_db(app_dir: &Path) -> Result<SqlitePool, sqlx::Error> {
    if !app_dir.exists() {
        fs::create_dir_all(app_dir).expect("Failed to create app directory");
    }

    let db_path = app_dir.join("cortex_map.db");
    
    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    // Create tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS nodes (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            role TEXT NOT NULL,
            metadata TEXT,
            parent_id TEXT
        );

        CREATE TABLE IF NOT EXISTS edges (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            target TEXT NOT NULL,
            edge_type TEXT NOT NULL,
            metadata TEXT
        );

        CREATE TABLE IF NOT EXISTS commits (
            id TEXT PRIMARY KEY,
            parent_id TEXT,
            agent_id TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            patch_id TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS patches (
            id TEXT PRIMARY KEY,
            operations TEXT NOT NULL
        );
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}
