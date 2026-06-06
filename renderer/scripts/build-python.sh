#!/bin/bash
# Build script for Python projects
# Placeholder: you can add your own build steps here, e.g., pip install -r requirements.txt
# For now, just run flake8 for linting or simple check.
if command -v flake8 >/dev/null 2>&1; then
  flake8 .
else
  echo "flake8 not installed; skipping lint."
fi
