use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use walkdir::WalkDir;

use crate::path_utils::{normalize_selected_folder_path, read_file_bytes_under_root as read_bytes_checked};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredFileDto {
    pub absolute_path: String,
    pub relative_path: String,
    pub file_name: String,
    pub extension: String,
    pub size_bytes: u64,
    pub modified_at_ms: i64,
}

fn supported_extension(path: &Path) -> Option<String> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    match ext.as_str() {
        "txt" | "md" | "pdf" => Some(ext),
        _ => None,
    }
}

#[tauri::command]
pub async fn open_folder_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let picked = app.dialog().file().blocking_pick_folder();
    let Some(folder_path) = picked else {
        return Ok(None);
    };
    let path = folder_path
        .into_path()
        .map_err(|_| "Failed to access selected folder path.".to_string())?;
    normalize_selected_folder_path(path).map(Some)
}

#[tauri::command]
pub fn discover_supported_files(root_path: String) -> Result<Vec<DiscoveredFileDto>, String> {
    let root = PathBuf::from(&root_path);
    let root_canon = std::fs::canonicalize(&root).map_err(|e| e.to_string())?;
    if !root_canon.is_dir() {
        return Err("Root path is not a directory.".to_string());
    }

    let mut out: Vec<DiscoveredFileDto> = Vec::new();
    for entry in WalkDir::new(&root_canon).follow_links(false) {
        let entry = entry.map_err(|e| e.to_string())?;
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let Some(ext) = supported_extension(path) else {
            continue;
        };
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let modified = meta.modified().map_err(|e| e.to_string())?;
        let modified_at_ms = modified
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis() as i64;

        let absolute_path = path.to_string_lossy().to_string();
        let relative_path = path
            .strip_prefix(&root_canon)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid file name.".to_string())?
            .to_string();

        out.push(DiscoveredFileDto {
            absolute_path,
            relative_path,
            file_name,
            extension: ext,
            size_bytes: meta.len(),
            modified_at_ms,
        });
    }

    out.sort_by(|a, b| a.absolute_path.cmp(&b.absolute_path));
    Ok(out)
}

#[tauri::command]
pub fn read_file_bytes_under_root(root_path: String, absolute_path: String) -> Result<Vec<u8>, String> {
    read_bytes_checked(&root_path, &absolute_path)
}

#[cfg(test)]
mod discover_tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn discovers_nested_supported_files() {
        let root = std::env::temp_dir().join("stackdrop_discover_root");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("a/b")).unwrap();
        let mut f = std::fs::File::create(root.join("a/b/hello.txt")).unwrap();
        writeln!(f, "hello").unwrap();
        drop(f);

        let list = discover_supported_files(root.to_string_lossy().to_string()).unwrap();
        assert_eq!(list.len(), 1);
        assert!(list[0].absolute_path.ends_with("hello.txt"));
        assert_eq!(list[0].extension, "txt");

        let _ = std::fs::remove_dir_all(&root);
    }
}
