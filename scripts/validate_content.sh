#!/usr/bin/env bash
# Rejoue tous les exercices (solution doit passer, starter doit échouer) et tous les quiz « code-output ».
set -euo pipefail
cd "$(dirname "$0")/.."
status=0
for meta in $(find content -name lab.yaml -o -name assignment.yaml -o -name project.yaml | sort); do
  dir=$(dirname "$meta")
  if out=$(.claude/skills/lab-authoring/scripts/verify_lab.sh "$dir" 2>&1); then
    echo "✅ $dir"
  else
    echo "❌ $dir"; echo "$out" | tail -5; status=1
  fi
done
for chapter in content/*/[0-9]*/; do
  [ -f "$chapter/chapter.yaml" ] && { python3 .claude/skills/lab-authoring/scripts/verify_quiz.py "$chapter" | tail -1 || status=1; }
done
(cd backend && uv run python -c "from app.content.loader import load_content; from app.core.config import settings; load_content(settings.content_dir); print('✅ contenu chargé par le backend')") || status=1
exit $status
