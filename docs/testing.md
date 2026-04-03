# Testing

Accord uses three layers of tests.

## Unit tests

Unit tests cover the domain and infrastructure helpers in isolation.
They are used for consensus grouping, orchestration flow, config parsing, and filesystem behavior.

## Contract tests

Contract tests cover provider adapters against the expected CLI boundary.
They check that each provider formats prompts and parses output consistently.

## Integration tests

Integration tests exercise the actual application flow with fakes instead of live provider CLIs.
They verify that debate runs produce the right rounds, claims, and exported markdown.

## Live provider policy

Live tests against real provider CLIs are opt-in.
They are not part of the default test suite because they depend on local tools, shell setup, and account state.
Keep them separate from deterministic unit and integration coverage.
