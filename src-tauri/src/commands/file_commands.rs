use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use dirs::{desktop_dir, document_dir, download_dir, home_dir};
use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use walkdir::WalkDir;

use crate::path_utils::{
    assert_path_within_root, normalize_selected_folder_path,
    read_file_bytes_under_root as read_bytes_checked,
};

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
        "txt" | "pdf" | "docx" | "doc" => Some(ext),
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
pub fn read_file_bytes_under_root(
    root_path: String,
    absolute_path: String,
) -> Result<Vec<u8>, String> {
    let root = root_path.trim();
    if root.is_empty() {
        return Err("Root path is empty.".to_string());
    }
    if absolute_path.trim().is_empty() {
        return Err("File path is empty.".to_string());
    }
    read_bytes_checked(root, &absolute_path)
}

fn run_command_capture(mut cmd: Command, context: &str) -> Result<String, String> {
    let output = cmd
        .output()
        .map_err(|e| format!("{context}: failed to spawn command: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let details = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!("exit code: {:?}", output.status.code())
        };
        return Err(format!("{context}: {details}"));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn make_temp_subdir(prefix: &str) -> Result<PathBuf, String> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let dir = std::env::temp_dir().join(format!("{prefix}-{stamp}"));
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
pub fn ocr_pdf_under_root(root_path: String, absolute_path: String) -> Result<String, String> {
    let root = root_path.trim();
    if root.is_empty() {
        return Err("Root path is empty.".to_string());
    }
    if absolute_path.trim().is_empty() {
        return Err("File path is empty.".to_string());
    }
    let canon = assert_path_within_root(root, &absolute_path)?;
    if !canon.is_file() {
        return Err("Path is not a file.".to_string());
    }
    if canon
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("pdf"))
        != Some(true)
    {
        return Err("OCR fallback only supports PDF files.".to_string());
    }

    let temp_dir = make_temp_subdir("stackdrop-ocr")?;
    let output_prefix = temp_dir.join("page");

    let mut pdftoppm = Command::new("pdftoppm");
    pdftoppm.arg("-png").arg(&canon).arg(&output_prefix);
    let pdftoppm_result = run_command_capture(pdftoppm, "PDF rasterization failed");
    if pdftoppm_result.is_err() {
        let _ = std::fs::remove_dir_all(&temp_dir);
        return pdftoppm_result.map(|_| String::new());
    }

    let mut images: Vec<PathBuf> = std::fs::read_dir(&temp_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|path| {
            path.extension()
                .and_then(|e| e.to_str())
                .map(|e| e.eq_ignore_ascii_case("png"))
                == Some(true)
        })
        .collect();
    images.sort();
    if images.is_empty() {
        let _ = std::fs::remove_dir_all(&temp_dir);
        return Err("OCR fallback could not produce page images.".to_string());
    }

    let mut out = Vec::new();
    for image in images {
        let mut tesseract = Command::new("tesseract");
        tesseract
            .arg(&image)
            .arg("stdout")
            .arg("-l")
            .arg("eng")
            .arg("--dpi")
            .arg("300");
        let page_text = run_command_capture(tesseract, "OCR text extraction failed")?;
        if !page_text.trim().is_empty() {
            out.push(page_text.trim().to_string());
        }
    }
    let _ = std::fs::remove_dir_all(&temp_dir);

    if out.is_empty() {
        return Err("OCR completed but returned empty text.".to_string());
    }
    Ok(out.join("\n"))
}

#[tauri::command]
pub fn extract_doc_text_under_root(
    root_path: String,
    absolute_path: String,
) -> Result<String, String> {
    let root = root_path.trim();
    if root.is_empty() {
        return Err("Root path is empty.".to_string());
    }
    if absolute_path.trim().is_empty() {
        return Err("File path is empty.".to_string());
    }
    let canon = assert_path_within_root(root, &absolute_path)?;
    if !canon.is_file() {
        return Err("Path is not a file.".to_string());
    }
    if canon
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("doc"))
        != Some(true)
    {
        return Err("Legacy extraction only supports .doc files.".to_string());
    }

    let mut antiword = Command::new("antiword");
    antiword.arg(&canon);
    antiword.env("LANG", "C.UTF-8");
    let text = run_command_capture(antiword, "Legacy .doc extraction failed")?;
    if text.trim().is_empty() {
        return Err("Legacy .doc parser returned empty text.".to_string());
    }
    Ok(text)
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
    let canon = match std::fs::canonicalize(&path) {
        Ok(path) => path,
        Err(_) => return Ok(()),
    };
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

fn candidate_paths() -> Vec<(&'static str, PathBuf)> {
    let mut out: Vec<(&'static str, PathBuf)> = Vec::new();

    if let Some(p) = document_dir() {
        out.push(("Documents", p));
    }
    if let Some(p) = desktop_dir() {
        out.push(("Desktop", p));
    }
    if let Some(p) = download_dir() {
        out.push(("Downloads", p));
    }
    if let Some(home) = home_dir() {
        out.push(("Documents", home.join("Documents")));
        out.push(("Desktop", home.join("Desktop")));
        out.push(("Downloads", home.join("Downloads")));
    }
    out
}

/// Canonical paths for Documents, Desktop, and Downloads when they exist.
#[tauri::command]
pub fn get_default_document_roots() -> Result<Vec<DefaultDocumentRootDto>, String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for (label, path) in candidate_paths() {
        push_unique_root(&mut out, &mut seen, label, path)?;
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
    use std::path::PathBuf;

    fn has_command(binary: &str, version_arg: &str) -> bool {
        Command::new(binary).arg(version_arg).output().is_ok()
    }

    fn fixtures_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../src/tests/fixtures")
            .canonicalize()
            .unwrap()
    }

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
    fn discovers_only_supported_extensions() {
        let root = std::env::temp_dir().join("stackdrop_discover_ext");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        std::fs::File::create(root.join("a.docx")).unwrap();
        std::fs::File::create(root.join("legacy.doc")).unwrap();
        std::fs::File::create(root.join("b.bin")).unwrap();

        let list = discover_supported_files(root.to_string_lossy().to_string()).unwrap();
        assert_eq!(list.len(), 2);
        assert!(list.iter().any(|f| f.extension == "docx"));
        assert!(list.iter().any(|f| f.extension == "doc"));

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn default_roots_skip_missing_directories() {
        let mut seen = std::collections::HashSet::new();
        let mut out = Vec::new();
        let missing = std::env::temp_dir()
            .join("stackdrop_missing_default_root")
            .join("Documents");
        push_unique_root(&mut out, &mut seen, "Documents", missing).unwrap();
        assert!(out.is_empty());
    }

    #[test]
    fn default_roots_include_existing_directory() {
        let dir = std::env::temp_dir().join("stackdrop_existing_default_root");
        let _ = std::fs::create_dir_all(&dir);
        let mut seen = std::collections::HashSet::new();
        let mut out = Vec::new();
        push_unique_root(&mut out, &mut seen, "Documents", dir.clone()).unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].label, "Documents");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn ocr_extracts_text_from_scanned_pdf_fixture() {
        if !has_command("pdftoppm", "-v") || !has_command("tesseract", "--version") {
            return;
        }
        let root = fixtures_dir();
        let scanned = root.join("scanned-image-only.pdf");
        let out = ocr_pdf_under_root(
            root.to_string_lossy().to_string(),
            scanned.to_string_lossy().to_string(),
        )
        .unwrap();
        assert!(out.contains("STACKDROP OCR TOKEN"));
    }

    #[test]
    fn ocr_returns_error_for_broken_pdf_fixture() {
        if !has_command("pdftoppm", "-v") || !has_command("tesseract", "--version") {
            return;
        }
        let root = fixtures_dir();
        let broken = root.join("broken.pdf");
        let err = ocr_pdf_under_root(
            root.to_string_lossy().to_string(),
            broken.to_string_lossy().to_string(),
        )
        .unwrap_err();
        assert!(!err.is_empty());
    }

    #[test]
    fn doc_extraction_works_for_legacy_fixture() {
        if !has_command("antiword", "-h") {
            return;
        }
        let root = fixtures_dir();
        let doc = root.join("legacy-sample.doc");
        let out = extract_doc_text_under_root(
            root.to_string_lossy().to_string(),
            doc.to_string_lossy().to_string(),
        )
        .unwrap();
        assert!(out.contains("Lorem ipsum"));
    }

    #[test]
    fn doc_extraction_fails_for_invalid_fixture() {
        if !has_command("antiword", "-h") {
            return;
        }
        let root = fixtures_dir();
        let doc = root.join("broken.doc");
        let err = extract_doc_text_under_root(
            root.to_string_lossy().to_string(),
            doc.to_string_lossy().to_string(),
        )
        .unwrap_err();
        assert!(!err.is_empty());
    }
}
