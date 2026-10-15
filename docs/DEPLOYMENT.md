# Deployment & environment

OneDrive holds the development project; it is not a web host. Production needs a Node host plus PostgreSQL.

## Environment variables

See [.env.example](../.env.example). Never commit real values.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | PostgreSQL connection string. Omit locally to use PGlite |
| `ET_DATA_DIR` | No | Local PGlite directory. Defaults to `%LOCALAPPDATA%\ETResearcherIQ` (outside OneDrive) |
| `RESEARCH_PACKAGE_DIR` | Import only | Path to `UAP_Research_Consolidated_v08` |
| `ADMIN_TOKEN`, `EDITOR_TOKEN`, `READER_TOKEN` | Production | Role tokens, 32+ random characters each; also sign session cookies |
| `CRON_TOKEN` | If using external cron | Bearer token for `POST /api/cron` |
| `ET_SCHEDULER`, `ET_SCHEDULER_MINUTES` | No | In-process scheduler; set `off` when the worker runs |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | No | Enables grounded LLM synthesis. Without them the assistant uses retrieval only |
| `ALLOW_PRIVATE_AI` | No | `true` permits sending private records to the model provider; default `false` |
| `ANALYTICS_URL`, `ANALYTICS_TOKEN` | No | Python analytical service for bootstrap CIs and Fisher on the server |

Generate a token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Render (configured)

[render.yaml](../render.yaml) creates the Docker web service `et-researcher-iq` (starter plan) and PostgreSQL `et-researcher-iq-db` (basic-256mb). Render generates the role tokens and `CRON_TOKEN`; none are in the repository. Every push to `main` redeploys.

1. Open https://dashboard.render.com/blueprint/new?repo=https://github.com/recaliendo/ET-Researcher-I.Q.App, sign in, connect GitHub if asked, review the two resources and their monthly cost, and click **Apply**.
2. Wait for the first deploy to go live, then open `https://<service>.onrender.com/api/health`.
3. One-time private import: in the database's **Networking** settings add your current IP to the access-control list, copy the **External Database URL**, and from the project folder run:

```bash
DATABASE_URL="<external database URL>?sslmode=require" pnpm import
```

4. Remove your IP from the access-control list again.
5. In the web service's **Environment** tab, copy `ADMIN_TOKEN`; on the site, click the sign-in button (top right) and paste it.
6. Open `/operations` to confirm all providers report a sync (the scheduler runs 30 s after start, then every 15 min).

Optional: a custom domain under the service's **Settings**. The GitHub scheduled-ingestion workflow is not needed while the in-process scheduler runs.

## Other container hosts (Railway, Fly.io, Azure Container Apps…)

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Set the role tokens and `CRON_TOKEN`.
3. Build and run the [Dockerfile](../Dockerfile); it listens on port 3000.
4. Import the private corpus once from a trusted machine that holds the package:

```bash
DATABASE_URL=postgres://… RESEARCH_PACKAGE_DIR=./UAP_Research_Consolidated_v08 pnpm import
```

5. Scheduling, pick one:
   - keep the in-process scheduler (single instance), or
   - run `pnpm worker` as a separate process and set `ET_SCHEDULER=off`, or
   - set GitHub secrets `APP_URL` and `CRON_TOKEN` to enable [scheduled-ingestion.yml](../.github/workflows/scheduled-ingestion.yml).
6. Visit `/operations` signed in as admin to confirm provider health.

Serverless hosts (e.g. Vercel, Netlify) work for the web app with `DATABASE_URL`, but use the cron workflow rather than the in-process scheduler.

## Optional analytics service

```bash
pip install -r analytics/requirements.txt
```

```bash
uvicorn analytics.service:app --host 127.0.0.1 --port 8001
```

Then set `ANALYTICS_URL=http://127.0.0.1:8001`.

## Backup & recovery

- PostgreSQL: daily `pg_dump` with point-in-time recovery if the host offers it. Back up before every import.
- Local PGlite: copy `%LOCALAPPDATA%\ETResearcherIQ\postgres` while the app is stopped.
- The research corpus can always be rebuilt from the checksum-verified package with `pnpm import`; reviews, task states and the audit log cannot, so they are what backups protect.
- Restore drill: restore into a fresh database, run `pnpm db:migrate`, start the app, and check `/api/health` and `/operations`.
