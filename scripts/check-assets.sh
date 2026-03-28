#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "[check-assets] erro: ripgrep (rg) nao encontrado." >&2
  exit 2
fi

refs_file="$(mktemp)"
files_file="$(mktemp)"
present_file="$(mktemp)"
missing_file="$(mktemp)"
trap 'rm -f "$refs_file" "$files_file" "$present_file" "$missing_file"' EXIT

# Extract /assets paths referenced by frontend entry files.
# Ignore directory-only tokens (ending with '/') because they are templates, not files.
rg -oI "/assets/[A-Za-z0-9_./-]+" index.html script.js \
  | awk '!/\/$/' \
  | sort -u > "$refs_file"

find assets -type f | sed 's#^assets#/assets#' | sort -u > "$files_file"

comm -12 "$refs_file" "$files_file" > "$present_file"
comm -23 "$refs_file" "$files_file" > "$missing_file"

refs_count="$(wc -l < "$refs_file" | tr -d ' ')"
files_count="$(wc -l < "$files_file" | tr -d ' ')"
present_count="$(wc -l < "$present_file" | tr -d ' ')"
missing_count="$(wc -l < "$missing_file" | tr -d ' ')"

echo "[check-assets] referencias: $refs_count"
echo "[check-assets] arquivos em assets/: $files_count"
echo "[check-assets] encontrados: $present_count"
echo "[check-assets] faltantes: $missing_count"

if [[ "$missing_count" -gt 0 ]]; then
  echo
  echo "[check-assets] faltantes por grupo:"
  awk -F'/' 'NF>=3 { key=$3; count[key]++ } END { for (k in count) printf "%s %d\n", k, count[k] }' "$missing_file" | sort

  echo
  echo "[check-assets] lista completa de faltantes:"
  cat "$missing_file"
  exit 1
fi

echo "[check-assets] OK: nenhuma referencia quebrada em /assets."
