# Changelog

## 2.1.0

- Fixed intermittent Session Replay ingest failures caused by recorder initialization with placeholder realm/token values.
- Added a replay credential guard to skip recorder init until real `realm` and `rumAccessToken` are available.
- Ensured runtime config updates always refresh the active replay credentials before replay init.

## 2.0.0

## URL parameters (breaking change)

Only the following URL params are supported for enabling Session Replay:

- `replay=on|true`
- `godmode=on|true` (enables all features and sets `maskAllInputs=false` and `maskAllText=false`)

Legacy params like `canvas` or `assets` are no longer supported.
This change is a breaking update for any existing replay URLs.

## 1.1.2
- Stabilized SPA + MPA session replay bootstrap flows.
- Ensured replay enablement via URL flag (`replay=on|true`) persists for the session.
- Kept masking defaults (`maskAllInputs`, `maskAllText`) and sensitivity rules configurable via bootstrap config.
