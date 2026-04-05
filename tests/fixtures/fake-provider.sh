#!/usr/bin/env bash
set -euo pipefail

provider="$(basename "$0")"
stage="unknown"
prompt=""
output_file=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --search|exec|--skip-git-repo-check|--sandbox|workspace-write|--full-auto|--dangerously-bypass-approvals-and-sandbox|--output-format|text|--permission-mode|default|--yolo)
      shift
      ;;
    -C|--cd|-m|--model|-s|--sandbox|-a|--ask-for-approval|-o|--output-last-message|-p|--prompt)
      if [ "$1" = "-o" ] || [ "$1" = "--output-last-message" ]; then
        output_file="$2"
      fi
      if [ "$1" = "-p" ] || [ "$1" = "--prompt" ]; then
        prompt="$2"
      fi
      shift 2
      ;;
    --*)
      shift
      ;;
    *)
      prompt="$1"
      shift
      ;;
  esac
done

case "$prompt" in
  *"Stage: shared_research"*) stage="shared_research" ;;
  *"Stage: provider_understanding"*) stage="provider_understanding" ;;
  *"Stage: provider_opinion"*) stage="provider_opinion" ;;
  *"Stage: provider_debate"*) stage="provider_debate" ;;
  *"Stage: final_synthesis"*) stage="final_synthesis" ;;
esac

if [ "${FAKE_FAIL_PROVIDER:-}" = "$provider" ] && [ "${FAKE_FAIL_STAGE:-}" = "$stage" ]; then
  echo "simulated failure for $provider/$stage" >&2
  exit 1
fi

topic="$(printf '%s' "$prompt" | awk -F': ' '/^Topic: / { print $2; exit }')"
slug="$(printf '%s' "$prompt" | awk -F': ' '/^Topic slug: / { print $2; exit }')"

rendered=""
case "$stage" in
  shared_research)
    rendered=$(cat <<EOF
# Shared research for ${topic}

- Coordinator: ${provider}
- Recent signal: condensed web research for ${slug}
- Source note: this is shared once with every provider
EOF
)
    ;;
  provider_understanding)
    rendered=$(cat <<EOF
# ${provider} understanding

- Topic: ${topic}
- Takeaway: ${provider} extracted the core facts from the shared research.
EOF
)
    ;;
  provider_opinion)
    rendered=$(cat <<EOF
# ${provider} opinion

- Answer: ${provider} gives an initial answer for ${topic}.
- Reasoning: this came from the shared research and the provider judgment.
EOF
)
    ;;
  provider_debate)
    rendered=$(cat <<EOF
# ${provider} debate revision

- Revision: ${provider} updated the answer after reading peer opinions.
- Debate note: ${provider} agrees on the main answer but sharpens the wording.
EOF
)
    ;;
  final_synthesis)
    rendered=$(cat <<EOF
# Final synthesis

- Coordinator: ${provider}
- Final answer: combined answer for ${topic}.
- Notes: built from shared research plus provider debate files.
EOF
)
    ;;
  *)
    rendered="# ${provider}\n\n- Fallback output"
    ;;
esac

if [ -n "$output_file" ]; then
  printf '%s\n' "$rendered" >"$output_file"
else
  printf '%s\n' "$rendered"
fi
