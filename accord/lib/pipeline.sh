#!/usr/bin/env bash

accord::artifact_path() {
  local run_dir="$1"
  local slug="$2"
  local suffix="$3"

  printf '%s/%s_%s.md' "$run_dir" "$slug" "$suffix"
}

accord::collect_peer_opinion_files() {
  local run_dir="$1"
  local slug="$2"
  local current_provider="$3"
  shift 3
  local providers=("$@")
  local provider
  local collected=()

  for provider in "${providers[@]}"; do
    [ "$provider" = "$current_provider" ] && continue
    collected+=("$(accord::artifact_path "$run_dir" "$slug" "${provider}_opinion_1")")
  done

  if [ "${#collected[@]}" -eq 0 ]; then
    return
  fi

  printf '%s\n' "${collected[@]}"
}

accord::resolve_available_providers() {
  local provider
  local available=()
  local missing=()

  for provider in "$@"; do
    if accord::provider_available "$provider"; then
      available+=("$provider")
    else
      missing+=("$provider")
    fi
  done

  ACCORD_AVAILABLE_PROVIDERS=()
  ACCORD_MISSING_PROVIDERS=()

  if [ "${#available[@]}" -gt 0 ]; then
    ACCORD_AVAILABLE_PROVIDERS=("${available[@]}")
  fi

  if [ "${#missing[@]}" -gt 0 ]; then
    ACCORD_MISSING_PROVIDERS=("${missing[@]}")
  fi
}

accord::pick_coordinator() {
  local requested="$1"
  local explicit="$2"
  shift 2
  local available=("$@")
  local provider

  for provider in "${available[@]}"; do
    if [ "$provider" = "$requested" ]; then
      printf '%s' "$requested"
      return
    fi
  done

  if [ "$explicit" = "1" ]; then
    accord::fail "Coordinator $requested is unavailable."
  fi

  if [ "${#available[@]}" -eq 0 ]; then
    accord::fail "No supported providers are available."
  fi

  accord::log "Coordinator $requested is unavailable; falling back to ${available[0]}"
  printf '%s' "${available[0]}"
}

accord::run_stage_for_providers() {
  local stage="$1"
  local run_dir="$2"
  local root="$3"
  local topic="$4"
  local slug="$5"
  local research_file="$6"
  shift 6
  local providers=("$@")
  local provider
  local prompt
  local output_file
  local peer_files=()
  local peer_file_lines=""
  local successful=()

  for provider in "${providers[@]}"; do
    case "$stage" in
      understanding)
        prompt="$(accord::provider_understanding_prompt "$root" "$topic" "$slug" "$provider" "$research_file")"
        output_file="$(accord::artifact_path "$run_dir" "$slug" "${provider}_understanding_1")"
        ;;
      opinion)
        prompt="$(accord::provider_opinion_prompt \
          "$root" \
          "$topic" \
          "$slug" \
          "$provider" \
          "$research_file" \
          "$(accord::artifact_path "$run_dir" "$slug" "${provider}_understanding_1")")"
        output_file="$(accord::artifact_path "$run_dir" "$slug" "${provider}_opinion_1")"
        ;;
      debate)
        peer_file_lines="$(accord::collect_peer_opinion_files "$run_dir" "$slug" "$provider" "${providers[@]}")"
        peer_files=()
        if [ -n "$peer_file_lines" ]; then
          while IFS= read -r peer_file; do
            [ -n "$peer_file" ] && [ -f "$peer_file" ] && peer_files+=("$peer_file")
          done <<EOF
$peer_file_lines
EOF
        fi
        if [ "${#peer_files[@]}" -gt 0 ]; then
          prompt="$(accord::provider_debate_prompt \
            "$root" \
            "$topic" \
            "$slug" \
            "$provider" \
            "$research_file" \
            "$(accord::artifact_path "$run_dir" "$slug" "${provider}_opinion_1")" \
            "${peer_files[@]}")"
        else
          prompt="$(accord::provider_debate_prompt \
            "$root" \
            "$topic" \
            "$slug" \
            "$provider" \
            "$research_file" \
            "$(accord::artifact_path "$run_dir" "$slug" "${provider}_opinion_1")")"
        fi
        output_file="$(accord::artifact_path "$run_dir" "$slug" "${provider}_debate_1")"
        ;;
      *)
        accord::fail "Unsupported stage: $stage"
        ;;
    esac

    accord::log "Running $stage for $provider"
    if accord::run_provider "$provider" "$prompt" "$output_file" "provider_${stage}" "$run_dir"; then
      successful+=("$provider")
    else
      accord::log "Provider $provider failed during $stage; continuing"
    fi
  done

  ACCORD_STAGE_PROVIDERS=()
  if [ "${#successful[@]}" -gt 0 ]; then
    ACCORD_STAGE_PROVIDERS=("${successful[@]}")
  fi
}

accord::main() {
  local root
  local output_root="runs"
  local coordinator="codex"
  local coordinator_explicit=0
  local providers_csv="codex,claude,gemini"
  local prompt=""
  local provider_list=()
  local available=()
  local missing=()
  local active=()
  local research_file=""
  local final_file=""
  local run_dir=""
  local slug=""
  local timestamp=""
  local provider=""
  local artifact_files=()

  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --coordinator)
        [ "$#" -ge 2 ] || accord::fail "--coordinator requires a value"
        coordinator="$2"
        coordinator_explicit=1
        shift 2
        ;;
      --providers)
        [ "$#" -ge 2 ] || accord::fail "--providers requires a value"
        providers_csv="$2"
        shift 2
        ;;
      --output)
        [ "$#" -ge 2 ] || accord::fail "--output requires a value"
        output_root="$2"
        shift 2
        ;;
      -h|--help)
        accord::usage
        exit 0
        ;;
      --)
        shift
        break
        ;;
      -*)
        accord::fail "Unknown option: $1"
        ;;
      *)
        if [ -n "$prompt" ]; then
          prompt="$prompt $1"
        else
          prompt="$1"
        fi
        shift
        ;;
    esac
  done

  while [ "$#" -gt 0 ]; do
    if [ -n "$prompt" ]; then
      prompt="$prompt $1"
    else
      prompt="$1"
    fi
    shift
  done

  [ -n "$prompt" ] || {
    accord::usage
    exit 1
  }

  IFS=',' read -r -a provider_list <<<"$providers_csv"
  accord::resolve_available_providers "${provider_list[@]}"
  if [ "${#ACCORD_AVAILABLE_PROVIDERS[@]}" -gt 0 ]; then
    available=("${ACCORD_AVAILABLE_PROVIDERS[@]}")
  fi
  if [ "${#ACCORD_MISSING_PROVIDERS[@]}" -gt 0 ]; then
    missing=("${ACCORD_MISSING_PROVIDERS[@]}")
  fi

  if [ "${#missing[@]}" -gt 0 ]; then
    accord::log "Missing providers: $(accord::join_by ', ' "${missing[@]}")"
  fi

  coordinator="$(accord::pick_coordinator "$coordinator" "$coordinator_explicit" "${available[@]}")"

  if [ "${#available[@]}" -eq 0 ]; then
    accord::fail "No providers are available to run."
  fi

  timestamp="$(accord::timestamp)"
  slug="$(accord::slugify "$prompt")"
  [ -n "$slug" ] || slug="topic"

  run_dir="$output_root/$timestamp-$slug"
  mkdir -p "$run_dir"

  accord::log "Run directory: $run_dir"
  accord::log "Active providers: $(accord::join_by ', ' "${available[@]}")"
  accord::log "Coordinator: $coordinator"

  research_file="$(accord::artifact_path "$run_dir" "$slug" "research_1")"
  final_file="$(accord::artifact_path "$run_dir" "$slug" "final_1")"

  if ! accord::run_provider \
    "$coordinator" \
    "$(accord::shared_research_prompt "$root" "$prompt" "$slug")" \
    "$research_file" \
    "shared_research" \
    "$run_dir"; then
    accord::fail "Coordinator $coordinator failed during shared research."
  fi

  active=("${available[@]}")

  accord::run_stage_for_providers understanding "$run_dir" "$root" "$prompt" "$slug" "$research_file" "${active[@]}"
  active=()
  if [ "${#ACCORD_STAGE_PROVIDERS[@]}" -gt 0 ]; then
    active=("${ACCORD_STAGE_PROVIDERS[@]}")
  fi
  [ "${#active[@]}" -gt 0 ] || accord::fail "No providers completed the understanding stage."

  accord::run_stage_for_providers opinion "$run_dir" "$root" "$prompt" "$slug" "$research_file" "${active[@]}"
  active=()
  if [ "${#ACCORD_STAGE_PROVIDERS[@]}" -gt 0 ]; then
    active=("${ACCORD_STAGE_PROVIDERS[@]}")
  fi
  [ "${#active[@]}" -gt 0 ] || accord::fail "No providers completed the opinion stage."

  accord::run_stage_for_providers debate "$run_dir" "$root" "$prompt" "$slug" "$research_file" "${active[@]}"
  if [ "${#ACCORD_STAGE_PROVIDERS[@]}" -gt 0 ]; then
    active=("${ACCORD_STAGE_PROVIDERS[@]}")
  fi

  artifact_files=("$research_file")
  for provider in "${active[@]}"; do
    artifact_files+=("$(accord::artifact_path "$run_dir" "$slug" "${provider}_understanding_1")")
    artifact_files+=("$(accord::artifact_path "$run_dir" "$slug" "${provider}_opinion_1")")
    if [ -f "$(accord::artifact_path "$run_dir" "$slug" "${provider}_debate_1")" ]; then
      artifact_files+=("$(accord::artifact_path "$run_dir" "$slug" "${provider}_debate_1")")
    fi
  done

  if ! accord::run_provider \
    "$coordinator" \
    "$(accord::final_synthesis_prompt "$root" "$prompt" "$slug" "$coordinator" "$research_file" "${artifact_files[@]}")" \
    "$final_file" \
    "final_synthesis" \
    "$run_dir"; then
    accord::fail "Coordinator $coordinator failed during final synthesis."
  fi

  printf '%s\n' "$run_dir"
}
