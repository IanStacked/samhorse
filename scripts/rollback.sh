#!/usr/bin/env bash
# rollback.sh for samhorse - single-command Cloudflare Pages rollback (TODO sh3).
#
# wrangler's CLI has no "pages deployment rollback" subcommand (checked against
# wrangler 4.114.0 - `deployment` only exposes list/create/tail/delete). The
# rollback operation only exists as a raw Cloudflare API endpoint:
#   POST /accounts/{account_id}/pages/projects/{project_name}/deployments/{id}/rollback
# (present in the `cloudflare` SDK wrangler bundles internally, never exposed as
# a CLI verb). So this script talks to that endpoint with curl directly instead
# of shelling out to wrangler.
#
# Usage:
#   scripts/rollback.sh                  # list recent deployments (id, env, when)
#   scripts/rollback.sh <deployment-id>  # roll production back to that deployment
#
# Requires CLOUDFLARE_API_TOKEN (Pages:Edit scope) and CLOUDFLARE_ACCOUNT_ID in
# the environment. Never pass the token as a curl argument (-H "...$TOKEN")
# directly - it would land in `ps`/`/proc/<pid>/cmdline`. It's fed to curl via
# a config file (-K) built by the `printf` builtin so it never becomes a
# separate process's argv either.
set -uo pipefail

PROJECT_NAME="${SAMHORSE_PAGES_PROJECT:-samhorse}"
API="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID:-}/pages/projects/${PROJECT_NAME}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "error: CLOUDFLARE_API_TOKEN is not set (needs Cloudflare Pages:Edit scope)" >&2
  exit 1
fi
if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "error: CLOUDFLARE_ACCOUNT_ID is not set" >&2
  exit 1
fi

auth_header_cfg() {
  printf 'header = "Authorization: Bearer %s"\n' "${CLOUDFLARE_API_TOKEN}"
}

if [[ $# -eq 0 ]]; then
  RESPONSE="$(curl -sS --max-time 15 -K <(auth_header_cfg) "${API}/deployments")" || {
    echo "error: could not reach the Cloudflare API" >&2
    exit 1
  }
  echo "$RESPONSE" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except json.JSONDecodeError:
    print("Cloudflare API returned a non-JSON response", file=sys.stderr)
    sys.exit(1)
if not data.get("success"):
    print("Cloudflare API error:", data.get("errors"), file=sys.stderr)
    sys.exit(1)
print("ID".ljust(38), "ENV".ljust(11), "CREATED".ljust(21), "URL")
for d in data["result"]:
    print(d.get("id","").ljust(38), d.get("environment","").ljust(11), d.get("created_on","").ljust(21), d.get("url",""))
' || exit 1
  echo
  echo "Run: scripts/rollback.sh <deployment-id>   to roll production back to one of the above."
  exit 0
fi

DEPLOYMENT_ID="$1"

echo "Rolling back ${PROJECT_NAME} production to deployment ${DEPLOYMENT_ID} ..."
RESPONSE="$(curl -sS --max-time 15 -X POST -K <(auth_header_cfg) \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${API}/deployments/${DEPLOYMENT_ID}/rollback")" || {
  echo "error: could not reach the Cloudflare API" >&2
  exit 1
}

echo "$RESPONSE" | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    print(json.dumps(json.loads(raw), indent=4))
except json.JSONDecodeError:
    print(raw)
'

if echo "$RESPONSE" | python3 -c 'import json,sys
try:
    ok = json.load(sys.stdin).get("success")
except json.JSONDecodeError:
    ok = False
sys.exit(0 if ok else 1)'; then
  echo "Rollback succeeded: ${PROJECT_NAME} production now serves deployment ${DEPLOYMENT_ID}."
else
  echo "Rollback failed - see response above." >&2
  exit 1
fi
