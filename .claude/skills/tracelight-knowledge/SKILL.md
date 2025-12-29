---
name: tracelight-analysis
description: Knowledge about code structure analysis and JSON documentation generation patterns. Use when analyzing code structure, generating call graphs, or creating search indexes.
---

# Tracelight Analysis Knowledge

## Overview

This skill provides knowledge for analyzing codebase structure and generating structured JSON documentation.

For language-specific analysis patterns, see:
- [Rust](./languages/rust.md)
- [TypeScript](./languages/typescript.md)

## Output Schema

### index.json

Main index file containing metadata and file references.

```json
{
  "version": "1.0",
  "generated_at": "ISO8601 timestamp",
  "target_dir": "path/to/target",
  "files": ["relative/path/to/file.json"],
  "stats": {
    "total_files": 0,
    "total_functions": 0,
    "total_structs": 0
  }
}
```

### Code Data JSON

Per-file or per-directory code structure data.

```json
{
  "path": "relative/path/to/file.rs",
  "language": "rust|typescript|python|go",
  "items": [
    {
      "id": "unique_id",
      "type": "function|struct|enum|trait|class|interface",
      "name": "item_name",
      "line_start": 1,
      "line_end": 10,
      "summary": "One-line description",
      "responsibility": "Detailed responsibility description",
      "visibility": "public|private|protected",
      "tests": ["test_function_name"],
      "calls": ["other_function_id"],
      "called_by": ["caller_function_id"]
    }
  ]
}
```

### search_index.json

Flattened search index for quick lookups.

```json
{
  "items": [
    {
      "id": "unique_id",
      "name": "item_name",
      "type": "function",
      "path": "relative/path/to/file.rs",
      "summary": "One-line description",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}
```

### call_graph/index.json

Call graph metadata and file references.

```json
{
  "nodes": ["node_id"],
  "edges_files": ["edges_001.json"]
}
```

## Language Detection

| Extension | Language |
|-----------|----------|
| `.rs` | rust |
| `.ts`, `.tsx` | typescript |
| `.js`, `.jsx` | javascript |
| `.py` | python |
| `.go` | go |

## Validation Rules

| Rule | Description |
|------|-------------|
| ID Uniqueness | All item IDs must be unique across the entire output |
| Reference Integrity | All `calls` and `called_by` must reference existing IDs |
| Schema Compliance | All JSON must validate against defined schemas |
| Path Consistency | All paths must be relative to target_dir |

## Error Recovery

| Error | Recovery Strategy |
|-------|-------------------|
| Parse failure | Skip file, log warning, continue |
| LLM timeout | Retry 3 times with exponential backoff |
| Invalid reference | Remove broken reference, log warning |
