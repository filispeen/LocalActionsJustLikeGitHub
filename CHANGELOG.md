# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## v0.1.0

- Actions page webview matching GitHub Actions layout with Primer CSS styling.
- Left workflow sidebar, live run list, and filter toolbar (search, event, status).
- Run detail view with interactive job dependency graph (DAG) derived from `needs`.
- Collapsible per-job execution steps with durations and real-time streaming status.
- Rich log viewer with ANSI terminal colors, search, copy button, and auto-scroll.
- Run dialog supporting dynamic `workflow_dispatch` input forms, JSON payload editor, and runner overrides.
- Components tree view detecting act CLI version and Docker Engine reachability with install guidance.
- Workflows tree view with automatic discovery of `.github/workflows`, live file watching, and error tolerance.
- Settings tree view and secure SecretStorage integration with automated log redaction.
- Robust process management with full process tree termination on Windows and POSIX.
