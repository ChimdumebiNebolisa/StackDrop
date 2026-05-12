use std::collections::HashSet;
use std::path::{Path, PathBuf};

use dirs::{desktop_dir, document_dir, download_dir};
use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use walkdir::WalkDir;

use crate::path_utils::{normalize_selected_folder_path, read_file_bytes_under_root as read_bytes_checked};

#[derive(Serialize, Clone, Debug)]
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
        "txt" | "pdf" | "docx" => Some(ext),
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
    let trimmed = root_path.trim();
    if trimmed.is_empty() {
        return Err("Root path is empty.".to_string());
    }
    let root = PathBuf::from(trimmed);
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
    let root = root_path.trim();
    if root.is_empty() {
        return Err("Root path is empty.".to_string());
    }
    if absolute_path.trim().is_empty() {
        return Err("File path is empty.".to_string());
    }
    read_bytes_checked(root, &absolute_path)
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DefaultDocumentRootDto {
    pub label: String,
    pub path: String,
}

fn push_unique_root(
    out: &mut Vec<DefaultDocumentRootDto>,
    seen: &mut HashSet<String>,
    label: &str,
    path: PathBuf,
) -> Result<(), String> {
    let canon = std::fs::canonicalize(&path).map_err(|e| e.to_string())?;
    if !canon.is_dir() {
        return Ok(());
    }
    let s = canon.to_string_lossy().to_string();
    if seen.insert(s.clone()) {
        out.push(DefaultDocumentRootDto {
            label: label.to_string(),
            path: s,
        });
    }
    Ok(())
}

/// Canonical paths for Documents, Desktop, and Downloads when they exist.
#[tauri::command]
pub fn get_default_document_roots() -> Result<Vec<DefaultDocumentRootDto>, String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    if let Some(p) = document_dir() {
        push_unique_root(&mut out, &mut seen, "Documents", p)?;
    }
    if let Some(p) = desktop_dir() {
        push_unique_root(&mut out, &mut seen, "Desktop", p)?;
    }
    if let Some(p) = download_dir() {
        push_unique_root(&mut out, &mut seen, "Downloads", p)?;
    }
    Ok(out)
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppHealthDto {
    pub ok: bool,
    pub package_version: String,
}

#[tauri::command]
pub fn app_health() -> AppHealthDto {
    AppHealthDto {
        ok: true,
        package_version: env!("CARGO_PKG_VERSION").to_string(),
    }
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

    #[test]
    fn rejects_empty_root_path_for_discover() {
        let err = discover_supported_files("   ".to_string()).unwrap_err();
        assert!(err.contains("empty"));
    }

    #[test]
    fn discovers_only_txt_pdf_docx() {
        let root = std::env::temp_dir().join("stackdrop_discover_ext");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        std::fs::File::create(root.join("a.docx")).unwrap();
        std::fs::File::create(root.join("b.bin")).unwrap();

        let list = discover_supported_files(root.to_string_lossy().to_string()).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].extension, "docx");

        let _ = std::fs::remove_dir_all(&root);
    }
}
