# ADR-0001: Cloudflare Pages rollback calls the API directly, not wrangler

**Date:** 2026-07-23
**Status:** Accepted

## Decision

`scripts/rollback.sh` talks to the Cloudflare REST API with `curl`
(`GET/POST .../pages/projects/<project>/deployments[...]`) instead of
shelling out to the `wrangler` CLI.

## Why

wrangler 4.114.0's `pages deployment` command group only exposes
`list`, `create`, `tail`, and `delete` — there is no `rollback`
subcommand (`wrangler pages deployment rollback` errors with `Unknown
argument: rollback`). The rollback operation only exists as a raw API
endpoint, `POST /accounts/{account_id}/pages/projects/{project}/deployments/{id}/rollback`
— confirmed present in the `cloudflare` SDK wrangler bundles
internally (`node_modules/wrangler/wrangler-dist/cli.js`), but never
exposed as a CLI verb. Calling it directly avoids taking a wrangler
dependency for a feature wrangler's CLI doesn't actually provide.

## Proof

Tested live against the real API with real credentials: rolling back
to the deployment already in production returned Cloudflare error
`8000039` ("You cannot rollback to the deployment that is currently
in production. You must rollback to a previous deployment.") — a
structured, semantically-correct rejection, confirming auth, project
routing, and the endpoint's real business logic all work. The
success path (rolling back to an older deployment) was accepted as
proven by this without executing it live, since doing so would
briefly revert the production site's content.
