#!/usr/bin/env bash

accord::template_path() {
  local root="$1"
  local name="$2"
  printf '%s/accord/prompts/%s' "$root" "$name"
}

accord::shared_research_prompt() {
  local root="$1"
  local topic="$2"
  local slug="$3"

  cat <<EOF
$(cat "$(accord::template_path "$root" "shared-research.md")")

Stage: shared_research
Topic: $topic
Topic slug: $slug
EOF
}

accord::provider_understanding_prompt() {
  local root="$1"
  local topic="$2"
  local slug="$3"
  local provider="$4"
  local research_file="$5"

  cat <<EOF
$(cat "$(accord::template_path "$root" "provider-understanding.md")")

Stage: provider_understanding
Topic: $topic
Topic slug: $slug
Provider: $provider

## Shared research
$(accord::read_file "$research_file")
EOF
}

accord::provider_opinion_prompt() {
  local root="$1"
  local topic="$2"
  local slug="$3"
  local provider="$4"
  local research_file="$5"
  local understanding_file="$6"

  cat <<EOF
$(cat "$(accord::template_path "$root" "provider-opinion.md")")

Stage: provider_opinion
Topic: $topic
Topic slug: $slug
Provider: $provider

## Shared research
$(accord::read_file "$research_file")

## Your understanding
$(accord::read_file "$understanding_file")
EOF
}

accord::provider_debate_prompt() {
  local root="$1"
  local topic="$2"
  local slug="$3"
  local provider="$4"
  local research_file="$5"
  local own_opinion_file="$6"
  shift 6
  local peer_files=("$@")
  local peer_file

  cat <<EOF
$(cat "$(accord::template_path "$root" "provider-debate.md")")

Stage: provider_debate
Topic: $topic
Topic slug: $slug
Provider: $provider

## Shared research
$(accord::read_file "$research_file")

## Your current opinion
$(accord::read_file "$own_opinion_file")

## Peer opinions
EOF

  if [ "${#peer_files[@]}" -eq 0 ]; then
    printf '%s\n' "No peer opinions were available for this run."
    return
  fi

  for peer_file in "${peer_files[@]}"; do
    printf '\n### %s\n%s\n' "$(basename "$peer_file")" "$(accord::read_file "$peer_file")"
  done
}

accord::final_synthesis_prompt() {
  local root="$1"
  local topic="$2"
  local slug="$3"
  local coordinator="$4"
  local research_file="$5"
  shift 5
  local files=("$@")
  local artifact_file

  cat <<EOF
$(cat "$(accord::template_path "$root" "final-synthesis.md")")

Stage: final_synthesis
Topic: $topic
Topic slug: $slug
Coordinator: $coordinator

## Shared research
$(accord::read_file "$research_file")

## Provider artifacts
EOF

  for artifact_file in "${files[@]}"; do
    [ -f "$artifact_file" ] || continue
    printf '\n### %s\n%s\n' "$(basename "$artifact_file")" "$(accord::read_file "$artifact_file")"
  done
}
