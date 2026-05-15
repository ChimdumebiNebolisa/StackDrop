use std::path::{Path, PathBuf};

const MAX_READ_BYTES: u64 = 50 * 1024 * 1024;

/// Convert canonical Windows verbatim paths into strings accepted by the JS fs plugin.
pub fn path_for_frontend(path: &Path) -> String {
    let raw = path.to_string_lossy().to_string();
    if let Some(stripped) = raw.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{}", stripped);
    }
    if let Some(stripped) = raw.strip_prefix(r"\\?\") {
        return stripped.to_string();
    }
    raw
}

/// Canonicalize a user-selected path and ensure it points to a regular file.
pub fn normalize_selected_file_path(path: PathBuf) -> Result<String, String> {
    let canonical = std::fs::canonicalize(&path).map_err(|error| error.to_string())?;
    if !canonical.is_file() {
        return Err("Selected path is not a file.".to_string());
    }
    Ok(path_for_frontend(&canonical))
}

/// Canonicalize a user-selected path and ensure it points to a directory.
pub fn normalize_selected_folder_path(path: PathBuf) -> Result<String, String> {
    let canonical = std::fs::canonicalize(&path).map_err(|error| error.to_string())?;
    if !canonical.is_dir() {
        return Err("Selected path is not a directory.".to_string());
    }
    Ok(path_for_frontend(&canonical))
}

/// Ensure `candidate` resolves under `root` (both canonicalized).
pub fn assert_path_within_root(root: &str, candidate: &str) -> Result<PathBuf, String> {
    let root_path = Path::new(root);
    let candidate_path = Path::new(candidate);
    let root_canon = std::fs::canonicalize(root_path).map_err(|e| e.to_string())?;
    let cand_canon = std::fs::canonicalize(candidate_path).map_err(|e| e.to_string())?;
    if !cand_canon.starts_with(&root_canon) {
        return Err("Path is not within the indexed folder root.".to_string());
    }
    Ok(cand_canon)
}

/// Read file bytes after validating it is under `root_path`. Enforces a size cap.
pub fn read_file_bytes_under_root(root_path: &str, absolute_path: &str) -> Result<Vec<u8>, String> {
    let canon = assert_path_within_root(root_path, absolute_path)?;
    if !canon.is_file() {
        return Err("Path is not a file.".to_string());
    }
    let meta = std::fs::metadata(&canon).map_err(|e| e.to_string())?;
    let len = meta.len();
    if len > MAX_READ_BYTES {
        return Err(format!(
            "File exceeds maximum read size of {} bytes.",
            MAX_READ_BYTES
        ));
    }
    std::fs::read(&canon).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn rejects_nonexistent_path() {
        let path = PathBuf::from("this_path_should_not_exist_stackdrop_12345.txt");
        assert!(normalize_selected_file_path(path).is_err());
    }

    #[test]
    fn accepts_existing_file() {
        let dir = std::env::temp_dir();
        let path = dir.join("stackdrop_path_utils_test.txt");
        let mut f = std::fs::File::create(&path).expect("create temp file");
        writeln!(f, "hello").expect("write");
        drop(f);
        let result = normalize_selected_file_path(path.clone());
        assert!(result.is_ok());
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn folder_accepts_directory() {
        let dir = std::env::temp_dir().join("stackdrop_folder_test_only");
        let _ = std::fs::create_dir_all(&dir);
        let result = normalize_selected_folder_path(dir.clone());
        assert!(result.is_ok());
        let _ = std::fs::remove_dir(dir);
    }

    #[test]
    fn frontend_paths_strip_windows_verbatim_prefixes() {
        let local = Path::new(r"\\?\C:\Users\Example\Documents");
        assert_eq!(path_for_frontend(local), r"C:\Users\Example\Documents");

        let unc = Path::new(r"\\?\UNC\server\share\Documents");
        assert_eq!(path_for_frontend(unc), r"\\server\share\Documents");
    }

    #[test]
    fn rejects_traversal_outside_root() {
        let root = std::env::temp_dir().join("stackdrop_root_only");
        let _ = std::fs::create_dir_all(&root);
        let outside = std::env::temp_dir().join("stackdrop_outside_only.txt");
        let mut f = std::fs::File::create(&outside).unwrap();
        writeln!(f, "x").unwrap();
        drop(f);
        let root_s = normalize_selected_folder_path(root.clone()).unwrap();
        let outside_s = outside.to_string_lossy().to_string();
        assert!(assert_path_within_root(&root_s, &outside_s).is_err());
        let _ = std::fs::remove_dir(root);
        let _ = std::fs::remove_file(outside);
    }
}
