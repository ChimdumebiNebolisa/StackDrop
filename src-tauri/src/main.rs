#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands {
    pub mod file_commands;
    pub mod summary_commands;
}

mod services {
    pub mod credential_store;
    pub mod openai_summary;
}

pub mod generated_file_capabilities;
mod path_utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(
            commands::summary_commands::SummaryCommandState::new()
                .expect("failed to initialize document summary services"),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::file_commands::open_folder_dialog,
            commands::file_commands::discover_supported_files,
            commands::file_commands::read_file_bytes_under_root,
            commands::file_commands::ocr_pdf_under_root,
            commands::file_commands::extract_doc_text_under_root,
            commands::file_commands::get_default_document_roots,
            commands::file_commands::app_health,
            commands::summary_commands::save_openai_api_key,
            commands::summary_commands::has_openai_api_key,
            commands::summary_commands::remove_openai_api_key,
            commands::summary_commands::summarize_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running StackDrop");
}

fn main() {
    run();
}
