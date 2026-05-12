use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::path_utils::normalize_selected_file_path;

#[tauri::command]
pub async fn open_file_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("Supported Files", &["txt", "md", "pdf"])
        .blocking_pick_file();

    let Some(file_path) = picked else {
        return Ok(None);
    };

    let path = file_path
        .into_path()
        .map_err(|_| "Failed to access selected file path.".to_string())?;

    normalize_selected_file_path(path).map(Some)
}
