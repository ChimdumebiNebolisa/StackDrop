use std::path::PathBuf;

/// Canonicalize a user-selected path and ensure it points to a regular file.
pub fn normalize_selected_file_path(path: PathBuf) -> Result<String, String> {
    let canonical = std::fs::canonicalize(&path).map_err(|error| error.to_string())?;
    if !canonical.is_file() {
        return Err("Selected path is not a file.".to_string());
    }
    Ok(canonical.to_string_lossy().to_string())
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
}
