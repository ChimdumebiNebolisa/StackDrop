mod commands {
    pub mod file_commands;
}

mod path_utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![commands::file_commands::open_file_dialog])
        .run(tauri::generate_context!())
        .expect("error while running StackDrop");
}

fn main() {
    run();
}
