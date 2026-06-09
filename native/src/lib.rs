use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::fs;
use std::path::Path;

/// Directories to skip when indexing a workspace.
const SKIP_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "target",      // Rust build output
    "dist",        // web/JS build output
    "build",       // common build output
    "out",         // Next.js / Electron output
    ".cache",      // various tools
    "__pycache__", // Python
    ".venv",       // Python virtual envs
    "venv",
    ".mypy_cache",
    ".ruff_cache",
    ".next",       // Next.js
    ".nuxt",       // Nuxt.js
    ".svelte-kit", // SvelteKit
    "vendor",      // PHP / Ruby gems
];

/// Binary / non-text extensions to skip when searching file contents.
const SKIP_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
    "pdf", "zip", "gz", "tar", "rar", "7z",
    "exe", "dll", "so", "dylib", "node",
    "woff", "woff2", "ttf", "otf", "eot",
    "mp3", "mp4", "wav", "ogg", "mov", "avi",
    "lock", "bin", "dat",
];

// ─────────────────────────────────────────────────────────────────────────────
// index_workspace
// ─────────────────────────────────────────────────────────────────────────────

/// Recursively index files in the given workspace directory, skipping
/// build artifacts and tool caches. Returns a JavaScript array of
/// absolute file paths.
#[napi]
pub fn index_workspace(root: String) -> Result<Vec<String>> {
    let mut files = Vec::new();
    fn recurse(dir: &Path, files: &mut Vec<String>) -> Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if SKIP_DIRS.contains(&name) {
                        continue;
                    }
                }
                recurse(&path, files)?;
            } else if path.is_file() {
                if let Some(p) = path.to_str() {
                    files.push(p.to_string());
                }
            }
        }
        Ok(())
    }
    let root_path = Path::new(&root);
    if !root_path.is_dir() {
        return Err(Error::new(Status::InvalidArg, "Root path is not a directory"));
    }
    recurse(root_path, &mut files)?;
    Ok(files)
}

// ─────────────────────────────────────────────────────────────────────────────
// clean_code
// ─────────────────────────────────────────────────────────────────────────────

/// Perform lightweight cleaning of source code text.
/// - Trims trailing whitespace on each line (preserves leading indentation).
/// - Collapses multiple consecutive blank lines into a single blank line.
#[napi]
pub fn clean_code(input: String) -> Result<String> {
    let mut result = String::with_capacity(input.len());
    let mut blank = false;
    for line in input.lines() {
        let trimmed = line.trim_end();
        if trimmed.is_empty() {
            if !blank {
                result.push('\n');
                blank = true;
            }
        } else {
            result.push_str(trimmed);
            result.push('\n');
            blank = false;
        }
    }
    Ok(result)
}

// ─────────────────────────────────────────────────────────────────────────────
// search_in_files  (native grep)
// ─────────────────────────────────────────────────────────────────────────────

#[napi(object)]
pub struct SearchMatch {
    pub file: String,
    pub line: u32,
    pub column: u32,
    pub text: String,
}

/// Search for `query` inside every text file under `root`.
/// Returns up to `max_results` matches (default 500).
/// Case-sensitive unless `case_insensitive` is true.
#[napi]
pub fn search_in_files(
    root: String,
    query: String,
    case_insensitive: Option<bool>,
    max_results: Option<u32>,
) -> Result<Vec<SearchMatch>> {
    if query.is_empty() {
        return Ok(vec![]);
    }

    let ci = case_insensitive.unwrap_or(false);
    let limit = max_results.unwrap_or(500) as usize;
    let needle = if ci { query.to_lowercase() } else { query.clone() };

    let mut results: Vec<SearchMatch> = Vec::new();

    let root_path = Path::new(&root);
    if !root_path.is_dir() {
        return Err(Error::new(Status::InvalidArg, "Root path is not a directory"));
    }

    fn walk(
        dir: &Path,
        needle: &str,
        ci: bool,
        limit: usize,
        results: &mut Vec<SearchMatch>,
    ) -> Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if SKIP_DIRS.contains(&name) {
                        continue;
                    }
                }
                if results.len() < limit {
                    walk(&path, needle, ci, limit, results)?;
                }
            } else if path.is_file() {
                // Skip known binary extensions
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if SKIP_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
                        continue;
                    }
                }
                if results.len() >= limit {
                    break;
                }
                // Read file — skip if it looks binary (null bytes in first 8 KB)
                let raw = match fs::read(&path) {
                    Ok(b) => b,
                    Err(_) => continue,
                };
                let probe = &raw[..raw.len().min(8192)];
                if probe.contains(&0u8) {
                    continue; // binary
                }
                let text = match std::str::from_utf8(&raw) {
                    Ok(s) => s,
                    Err(_) => continue,
                };
                let file_str = path.to_string_lossy().to_string();
                for (line_idx, line_text) in text.lines().enumerate() {
                    if results.len() >= limit {
                        break;
                    }
                    let haystack = if ci {
                        line_text.to_lowercase()
                    } else {
                        line_text.to_string()
                    };
                    if let Some(col) = haystack.find(needle) {
                        results.push(SearchMatch {
                            file: file_str.clone(),
                            line: (line_idx + 1) as u32,
                            column: col as u32,
                            text: line_text.to_string(),
                        });
                    }
                }
            }
        }
        Ok(())
    }

    walk(root_path, &needle, ci, limit, &mut results)?;
    Ok(results)
}

// ─────────────────────────────────────────────────────────────────────────────
// count_lines
// ─────────────────────────────────────────────────────────────────────────────

#[napi(object)]
pub struct FileLineCount {
    pub file: String,
    pub lines: u32,
    pub bytes: u32,
}

/// Count lines and bytes for every text file under `root`.
/// Returns a list sorted by descending line count.
#[napi]
pub fn count_lines(root: String) -> Result<Vec<FileLineCount>> {
    let root_path = Path::new(&root);
    if !root_path.is_dir() {
        return Err(Error::new(Status::InvalidArg, "Root path is not a directory"));
    }

    let mut results: Vec<FileLineCount> = Vec::new();

    fn walk(dir: &Path, results: &mut Vec<FileLineCount>) -> Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if SKIP_DIRS.contains(&name) {
                        continue;
                    }
                }
                walk(&path, results)?;
            } else if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if SKIP_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
                        continue;
                    }
                }
                let raw = match fs::read(&path) {
                    Ok(b) => b,
                    Err(_) => continue,
                };
                let probe = &raw[..raw.len().min(8192)];
                if probe.contains(&0u8) {
                    continue;
                }
                let bytes = raw.len() as u32;
                let lines = raw.iter().filter(|&&b| b == b'\n').count() as u32 + 1;
                results.push(FileLineCount {
                    file: path.to_string_lossy().to_string(),
                    lines,
                    bytes,
                });
            }
        }
        Ok(())
    }

    walk(root_path, &mut results)?;
    results.sort_by(|a, b| b.lines.cmp(&a.lines));
    Ok(results)
}

// ─────────────────────────────────────────────────────────────────────────────
// diff_strings  (lightweight unified diff)
// ─────────────────────────────────────────────────────────────────────────────

#[napi(object)]
pub struct DiffLine {
    pub kind: String,   // "equal" | "insert" | "delete"
    pub line_a: Option<u32>,
    pub line_b: Option<u32>,
    pub text: String,
}

/// Produce a simple line-by-line diff between `text_a` and `text_b`.
/// Uses the patience/LCS algorithm based on longest common subsequence.
/// Returns each line tagged as "equal", "insert", or "delete".
#[napi]
pub fn diff_strings(text_a: String, text_b: String) -> Result<Vec<DiffLine>> {
    let lines_a: Vec<&str> = text_a.lines().collect();
    let lines_b: Vec<&str> = text_b.lines().collect();

    let m = lines_a.len();
    let n = lines_b.len();

    // Build LCS table
    let mut lcs = vec![vec![0usize; n + 1]; m + 1];
    for i in (0..m).rev() {
        for j in (0..n).rev() {
            lcs[i][j] = if lines_a[i] == lines_b[j] {
                lcs[i + 1][j + 1] + 1
            } else {
                lcs[i + 1][j].max(lcs[i][j + 1])
            };
        }
    }

    let mut result: Vec<DiffLine> = Vec::new();
    let (mut i, mut j) = (0usize, 0usize);
    while i < m || j < n {
        if i < m && j < n && lines_a[i] == lines_b[j] {
            result.push(DiffLine {
                kind: "equal".to_string(),
                line_a: Some((i + 1) as u32),
                line_b: Some((j + 1) as u32),
                text: lines_a[i].to_string(),
            });
            i += 1;
            j += 1;
        } else if j < n && (i >= m || lcs[i][j + 1] >= lcs[i + 1][j]) {
            result.push(DiffLine {
                kind: "insert".to_string(),
                line_a: None,
                line_b: Some((j + 1) as u32),
                text: lines_b[j].to_string(),
            });
            j += 1;
        } else {
            result.push(DiffLine {
                kind: "delete".to_string(),
                line_a: Some((i + 1) as u32),
                line_b: None,
                text: lines_a[i].to_string(),
            });
            i += 1;
        }
    }
    Ok(result)
}
