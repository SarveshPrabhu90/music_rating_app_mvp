# Internal Jobs Rollout

This checklist activates and verifies the production scheduler for internal jobs.

## 1) Ensure app env is set

In your deployed app environment, set:

- `INTERNAL_JOB_SECRET`: a strong random secret shared with GitHub Actions.

Optional for authenticated Expo push sends:

- `EXPO_ACCESS_TOKEN`: Expo access token used by push dispatch jobs.

## 2) Configure GitHub repository secrets

From the repo root, run:

```bash
gh secret set APP_BASE_URL --body "https://your-app.example.com"
gh secret set INTERNAL_JOB_SECRET --body "<same-secret-as-deployed-app>"
```

## 3) Commit and push workflow changes

The scheduler workflow only exists remotely after push.

```bash
git add .github/workflows/internal-jobs.yml README.md .env.example prisma.config.ts package.json
git commit -m "chore: add internal jobs scheduler and prisma config"
git push origin main
```

If your commit includes more files, include those intentionally.

## 4) Trigger and watch a manual run

```bash
npm run ops:trigger-jobs
```

This dispatches `.github/workflows/internal-jobs.yml` and watches the latest run.

## 5) Verify runtime behavior

- Recommendations endpoint should return refreshed rows for active users.
- Weekly recap endpoint should contain generated recap data for the current week.
- Push dispatch endpoint should report queued and sent token counts.
- GitHub Actions logs should show successful `curl --fail` calls to recommendation, weekly recap, and push dispatch routes.

## 6) Ongoing schedule

Configured cadence in workflow:

- Hourly recommendation refresh
- Hourly recommendation push dispatch (after recommendation refresh)
- Weekly recap generation every Monday at 08:15 UTC
- Weekly recap push dispatch every Monday at 08:15 UTC (after recap generation)
