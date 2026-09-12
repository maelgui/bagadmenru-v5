# Dev Environment (compose stacks, Storybook, HMR)

Use `finch compose` (not `docker compose`) on this machine (macOS dev host).

## Running the full stack per worktree without conflicts

Several worktrees can run their stack in parallel; isolate them:

1. One compose project name per worktree: `-p bmr-<slug>` — distinct
   containers and volumes per worktree.
2. The stack publishes a single host port, `FRONTEND_PORT` (default 5173);
   everything else (backend, db, minio, mailpit) is reached in-network through
   the Vite proxy. Storybook is NOT part of the compose stack.
3. Pick a free port BEFORE launching (macOS):
   `p=5173; while lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; do p=$((p+1)); done; echo $p`
4. Launch: `FRONTEND_PORT=<free_port> finch compose -p bmr-<slug> up -d`
5. Tell the user the real URL: `http://localhost:<free_port>`
6. Stop only this worktree's stack: `finch compose -p bmr-<slug> down`
   (add `-v` only if the user also wants this project's db/s3 volumes gone).
7. List running stacks: `finch compose ls` (or `finch ps`).

## Storybook

Storybook is a separate dev server, not run via finch. On demand only (when
the user explicitly asks), from `frontend/app`: `yarn storybook`
(= `storybook dev -p 6006 --no-open`). If 6006 is taken by another worktree:
`yarn storybook -- -p <free_port>`.

## HMR under Finch on macOS

Under Finch (Linux VM on macOS), fsevents do not cross the bind-mount, so
Vite's default watcher never fires. Already handled by the project:
`vite.config.ts` enables chokidar polling (`server.watch.usePolling`,
1000 ms) when `VITE_USE_POLLING=true`, and `docker-compose.yml` sets it on the
`frontend` service — HMR works out of the box via finch compose. If reloads
feel slow, lower the interval; if CPU runs hot, raise it. Do not disable this
polling for containerized dev. The backend (`uvicorn --reload`) has not shown
the issue; if it ever does, set `WATCHFILES_FORCE_POLLING=true` on the
`backend` service.
