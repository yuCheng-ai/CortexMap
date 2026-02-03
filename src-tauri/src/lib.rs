pub mod models;
pub mod db;
pub mod server;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            // Use local db directory for development
            let app_dir = std::path::PathBuf::from("db");
            
            tauri::async_runtime::spawn(async move {
                let pool = db::init_db(&app_dir).await.expect("Failed to initialize database");
                server::start_server(pool).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
