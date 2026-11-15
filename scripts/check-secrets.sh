#!/usr/bin/env bash
set -euo pipefail
if git ls-files | grep -E '(^|/)\.env($|\.)|demo-users\.env|assay\.env\.local' | grep -v '^\.env\.example$'; then
  echo "Tracked environment or credential file detected." >&2
  exit 1
fi
if git grep -nE 'sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|(NEARAI|OPENROUTER|REPPO)_API_KEY=[^ ]+|DATABASE_URL=postgres(ql)?://' -- . ':!pnpm-lock.yaml' >/tmp/assay-secret-hits.txt; then
  echo "Potential secret material detected in tracked files:" >&2
  cat /tmp/assay-secret-hits.txt >&2
  exit 1
fi
echo "Secret hygiene check passed."
