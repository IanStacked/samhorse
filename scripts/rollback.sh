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
# the environment. Never pass the token as an argument - it would land in shell
# history and process listings.
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

if [[ $# -eq 0 ]]; then
  RESPONSE="$(curl -sS --max-time 15 "${API}/deployments" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")" || {
    echo "error: could not reach the Cloudflare API" >&2
    exit 1
  }
  echo "$RESPONSE" | python3 -c '
import json, sys
data = json.load(sys.stdin)
if not data.get("success"):
    print("Cloudflare API error:", data.get("errors"), file=sys.stderr)
    sys.exit(1)
print("ID".ljust(34), "ENV".ljust(11), "CREATED".ljust(21), "URL")
for d in data["result"]:
    print(d["id"].ljust(34), d["environment"].ljust(11), d["created_on"].ljust(21), d["url"])
' || exit 1
  echo
  echo "Run: scripts/rollback.sh <deployment-id>   to roll production back to one of the above."
  exit 0
fi

DEPLOYMENT_ID="$1"

echo "Rolling back ${PROJECT_NAME} production to deployment ${DEPLOYMENT_ID} ..."
RESPONSE="$(curl -sS --max-time 15 -X POST "${API}/deployments/${DEPLOYMENT_ID}/rollback" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}')" || {
  echo "error: could not reach the Cloudflare API" >&2
  exit 1
}

echo "$RESPONSE" | python3 -m json.tool

if echo "$RESPONSE" | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("success") else 1)'; then
  echo "Rollback succeeded: ${PROJECT_NAME} production now serves deployment ${DEPLOYMENT_ID}."
else
  echo "Rollback failed - see response above." >&2
  exit 1
fi
