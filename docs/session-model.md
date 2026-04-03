# Session Model

Accord stores saved sessions on disk as JSON files under the configured storage directory.
The default storage path is `.accord/sessions`, and `SessionRepository` writes each session to `<storageDir>/<sessionId>/session.json`.

## What is persisted

`SessionRecord` is the top-level saved shape:

- `id`
- `createdAt`
- `updatedAt`
- `title`
- optional `run`

`run` is a `DebateRun` from `src/domain/models/debate.ts`.
It stores the debate topic, selected provider ids, round metadata, provider findings, and the final consensus result.

## Safety rules

Session ids are validated before save and load.
The repository rejects empty ids and path traversal attempts so a session id cannot escape the storage directory.

## Practical use

The session model is intentionally simple:

- the CLI can list or resume sessions without re-running providers;
- the repository can persist and reload a complete debate result;
- the docs and tests can reason about the on-disk format as plain JSON.
