#!/usr/bin/env bash
# health.sh for samhorse - the health contract in MANAGED-PROJECTS.md (everythingdev).
#
# Emits ONE JSON object on stdout: {liveness, services, errors, checked_at}.
# The dashboard runs this live to render the project's health; nothing caches it.
#
# A static Cloudflare Pages site has one service worth checking: the site itself.
# 200 on the homepage -> green; any other HTTP status -> down; curl unable to
# connect at all -> unknown (the check could not determine state - never a faked
# value either way). errors stays null: error_sink.kind is none.
set -uo pipefail

URL="${SAMHORSE_URL:-https://samhorse.pages.dev/}"
CHECKED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$URL" 2>/dev/null)" || HTTP_CODE="000"

case "$HTTP_CODE" in
  200)  LIVENESS="green" ;;
  000)  LIVENESS="unknown" ;;
  *)    LIVENESS="down" ;;
esac

printf '{"liveness":"%s","services":[{"name":"site","status":"%s","detail":"GET %s -> %s"}],"errors":{"window":"24h","unhandled":null,"handled_with_fix":null},"checked_at":"%s"}\n' \
  "$LIVENESS" "$LIVENESS" "$URL" "$HTTP_CODE" "$CHECKED_AT"
