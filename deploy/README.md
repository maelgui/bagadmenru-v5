# Deploy Scripts

Deploy scripts for the VPS webhook-based deployment.

See [docs/DEPLOY.md](../docs/DEPLOY.md) for full documentation, architecture overview, and step-by-step first deployment guide.

## Files

| File | Purpose |
|---|---|
| `deploy.sh` | Main deploy script — `deploy.sh <beta\|prod> <deploy-tag>` |
| `hooks.json` | [adnanh/webhook](https://github.com/adnanh/webhook) config |
| `.env.beta.example` | Template for beta environment variables |
| `.env.prod.example` | Template for prod environment variables |

## Requirements

- `curl` and `jq` (for GitHub API release downloads)
- A GitHub fine-grained PAT with `contents:read` scope (set as `GITHUB_TOKEN` in `.env`)
