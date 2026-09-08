# Deploying SMADY entirely on AWS

Since your database is already on AWS RDS, keeping everything on AWS avoids cross-cloud latency
and gives you one bill/one console. Simplest reliable setup: **backend on Elastic Beanstalk**
(same service type your ICP Engine already runs on, so your team already knows it) and
**frontend on AWS Amplify Hosting** (simplest static-site host on AWS, free-tier friendly).

## 0. Get your code out of Emergent
Use **"Save to GitHub"** in the Emergent chat input to push this repo to your own GitHub account.

## 1. Backend → Elastic Beanstalk (Python platform)

1. Install the EB CLI locally: `pip install awsebcli`
2. From the `backend/` folder: `eb init` → pick your region (use the **same region as your RDS
   instance**, e.g. `eu-north-1`, to avoid cross-region latency/cost) → platform "Python 3.11".
3. Add a `Procfile` in `backend/` (if not already present):
   ```
   web: uvicorn server:app --host 0.0.0.0 --port 8000
   ```
4. Set environment variables (EB Console → Configuration → Software → Environment properties, or
   `eb setenv KEY=value KEY2=value2 ...`):

   | Variable | Value / where it comes from |
   |---|---|
   | `DB_HOST` | Your RDS endpoint (unchanged) |
   | `DB_PORT` | `5432` |
   | `DB_USER` / `DB_PASSWORD` | RDS credentials |
   | `PG_DATABASE` | `postgres` |
   | `DB_SCHEMA` | `smady` |
   | `DB_SSLMODE` | `prefer` |
   | `ICP_ENGINE_API_URL` | `http://icp-engine-api-env.eba-vbwk9qkm.eu-north-1.elasticbeanstalk.com/api/v1/recommend` |
   | `N8N_LEADS_WEBHOOK_URL` / `N8N_OUTREACH_WEBHOOK_URL` / `N8N_MEETINGS_WEBHOOK_URL` / `N8N_PROPOSALS_WEBHOOK_URL` | Your n8n webhook URLs |
   | `N8N_CALLBACK_SECRET` | **New random secret for production** — must match what you put in n8n's HTTP node headers |
   | `PUBLIC_BACKEND_URL` | Your EB environment's URL, e.g. `http://smady-backend-env.eba-xxxxx.eu-north-1.elasticbeanstalk.com` (or your custom domain once set up) |
   | `CORS_ORIGINS` | Your Amplify frontend URL |
   | `JWT_SECRET` | **New random 32+ char secret for production** |

5. **Security Group**: make sure the EB environment's security group allows inbound on port 80/443
   from the internet, AND that your RDS security group allows inbound from the EB environment's
   security group on port 5432 (this is the same kind of allowlisting you already had to do to let
   this environment reach your ICP Engine — same idea, reversed).
6. Deploy: `eb create smady-backend-env` (first time) or `eb deploy` (subsequent updates).
7. For HTTPS: put an Application Load Balancer in front (EB can provision one automatically —
   choose "load balanced" environment type) and attach an ACM certificate for your domain.

## 2. Frontend → AWS Amplify Hosting

1. AWS Console → Amplify → **Host a web app** → connect the same GitHub repo, branch `main`.
2. Set the app root to `frontend/`. Amplify auto-detects the Vite build; if not, set manually:
   - Build command: `yarn build`
   - Output directory: `dist`
3. Add one Environment Variable in Amplify's build settings:

   | Variable | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | Your EB backend URL from step 1 (no trailing `/api`) |

4. Save and deploy. Amplify gives you a URL like `https://main.dxxxxx.amplifyapp.com`.
5. Go back to EB and set `CORS_ORIGINS` / `PUBLIC_BACKEND_URL` to match, redeploy.

*(Alternative if you'd rather not use Amplify: build locally with `yarn build`, upload the
`frontend/dist` folder to an S3 bucket with static website hosting enabled, and put a CloudFront
distribution in front for HTTPS + caching. More manual, same result.)*

## 3. Update your n8n workflows
Change every n8n "HTTP Request" callback node's URL from the old Emergent preview URL to your new
EB backend URL (e.g. `.../api/leads/callback`), and update the `X-Callback-Secret` header value to
match your new `N8N_CALLBACK_SECRET`.

## 4. Custom domain (optional)
Route 53 → point your domain's A/ALIAS record at the Amplify app (frontend) and the ALB/EB
environment (backend, e.g. as `api.yourdomain.com`) → request free certificates via ACM for both.

---
**You do NOT need a new database** — everything here reuses your existing AWS RDS Postgres
instance exactly as-is. Just double check the EB environment and RDS are in the same AWS region
you chose, and that the RDS security group allows inbound traffic from the new backend.
