#!/usr/bin/env bash
# Verify a lab: tests must PASS against solution/ and FAIL against starter/.
# Runs in a throwaway Docker container with no network.
#
# Usage: verify_lab.sh <lab_dir>          (lab_dir contains lab.yaml, starter/, solution/, tests/)
# Env:   LAB_IMAGE  override runner image
#
# Runner image: sandbox/images/<language>/Dockerfile if present (built as btd-runner-<language>),
# otherwise a default public image.
set -euo pipefail

lab_dir="${1:?usage: verify_lab.sh <lab_dir>}"
lab_dir="$(cd "$lab_dir" && pwd)"
yaml=""
for f in lab.yaml assignment.yaml project.yaml; do [[ -f "$lab_dir/$f" ]] && yaml="$lab_dir/$f" && break; done
[[ -n "$yaml" ]] || { echo "missing lab.yaml/assignment.yaml/project.yaml in $lab_dir" >&2; exit 2; }

field() { sed -n "s/^$1:[[:space:]]*//p" "$yaml" | head -1 | sed 's/[[:space:]]#.*$//; s/[[:space:]]*$//; s/^"\(.*\)"$/\1/'; }

# Diagram exercise: nothing to run, the graph rules are checked by the backend.
if [[ "$(field kind)" == "diagram" ]]; then
  repo_root="$(cd "$(dirname "$0")/../../../.." && pwd)"
  cd "$repo_root/backend" && exec go run ./cmd/btd verify-diagram "$lab_dir"
fi
language="$(field language)"
test_command="$(field test_command)"
timeout_s="$(field timeout_s)"; timeout_s="${timeout_s:-30}"
[[ -n "$language" && -n "$test_command" ]] || { echo "lab.yaml needs language and test_command" >&2; exit 2; }
for d in starter solution tests; do [[ -d "$lab_dir/$d" ]] || { echo "missing $d/" >&2; exit 2; }; done

repo_root="$(cd "$(dirname "$0")/../../../.." && pwd)"
if [[ -n "${LAB_IMAGE:-}" ]]; then
  image="$LAB_IMAGE"
elif [[ -f "$repo_root/sandbox/images/$language/Dockerfile" ]]; then
  image="btd-runner-$language"
  docker build -q -t "$image" "$repo_root/sandbox/images/$language" >/dev/null
else
  case "$language" in
    go) image="golang:1" ;;
    python) image="python:3.12-slim" ;;
    *) echo "no default image for language '$language'; add sandbox/images/$language/Dockerfile" >&2; exit 2 ;;
  esac
fi

run_against() {  # $1 = starter|solution ; prints test output, returns test exit code
  local work; work="$(mktemp -d)"
  cp -R "$lab_dir/$1/." "$work/"
  cp -R "$lab_dir/tests/." "$work/"
  local rc=0
  docker run --rm --network none --cpus 1 --memory 512m --pids-limit 256 \
    -e GOTOOLCHAIN=local -e GOFLAGS=-mod=mod -e HOME=/tmp \
    -v "$work:/work" -w /work "$image" \
    timeout "$timeout_s" sh -c "$test_command" || rc=$?
  rm -rf "$work"
  return $rc
}

echo "== solution (must pass) — $image: $test_command"
if run_against solution; then sol=pass; else sol=fail; fi
echo "== starter (must fail)"
if run_against starter >/dev/null 2>&1; then start=pass; else start=fail; fi

echo
echo "solution: $sol   starter: $start"
if [[ "$sol" == pass && "$start" == fail ]]; then
  echo "✅ VERIFIED — set in $(basename "$yaml"): verified: { at: $(date +%F), solution: pass, starter: fail }"
  exit 0
fi
[[ "$sol" == fail ]] && echo "❌ solution does not pass its tests"
[[ "$start" == pass ]] && echo "❌ starter already passes — tests do not check the exercise"
exit 1
