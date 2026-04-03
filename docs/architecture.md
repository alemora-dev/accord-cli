# Architecture

Accord is split into four layers so the debate logic stays testable and the CLI stays thin.

`src/cli`
contains the user-facing commands, prompts, and presenters. It turns command-line actions into use-case calls and renders status back to the terminal.

`src/application`
contains use cases such as running a debate, resuming a session, and setting up providers. These functions coordinate the flow but do not know about shell prompts or persistence details.

`src/domain`
contains the debate model, consensus rules, and orchestration logic. The orchestrator runs provider executions in rounds, and the consensus engine groups claims into consensus or disagreements.

`src/providers`
contains provider adapters and prompt construction. Each provider maps the shared execution context to a specific local CLI and normalizes its output for the orchestrator.

`src/infrastructure`
contains filesystem access, config loading, process execution, and export helpers. These are the concrete adapters that talk to disk and external commands.

The runtime flow is:

1. The CLI collects the user intent.
2. An application use case creates or resumes a debate.
3. The orchestrator runs providers for the independent round and the cross-review round.
4. The consensus engine groups the reviewed claims.
5. Infrastructure code persists sessions or formats exported reports.
