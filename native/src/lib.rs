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

/// Perform lightweight cleaning of source code text.
/// - Trims trailing whitespace on each line (preserves leading indentation).
/// - Collapses multiple consecutive blank lines into a single blank line.
#[napi]
pub fn clean_code(input: String) -> Result<String> {
    let mut result = String::new();
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
