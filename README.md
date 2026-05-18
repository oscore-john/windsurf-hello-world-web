# windsurf-hello-world-web

A static landing page deployed on [Vercel](https://vercel.com), used for verifying web deployments.

## Deployment Protection

Preview deployments are protected via [Vercel Deployment Protection](https://vercel.com/docs/security/deployment-protection). Automated tools can bypass protection using the project's bypass secret.

### Accessing protected previews

**HTTP header:**

```
curl -H "x-vercel-protection-bypass: <secret>" <preview-url>
```

**Query parameter:**

```
curl "<preview-url>?x-vercel-protection-bypass=<secret>"
```

**Browser-style testing (sets a session cookie):**

```
curl -H "x-vercel-protection-bypass: <secret>" \
     -H "x-vercel-set-bypass-cookie: true" \
     <preview-url>
```

### Secret storage

| Location | Purpose |
|---|---|
| Vercel project settings | Source of truth; also available as `VERCEL_AUTOMATION_BYPASS_SECRET` env var in Vercel builds |
| GitHub Actions secret `VERCEL_AUTOMATION_BYPASS_SECRET` | Used by the `verify-preview` CI workflow |
| Devin org secrets | Allows Devin to access protected preview deployments during sessions |

### CI verification

The `.github/workflows/verify-preview.yml` workflow runs automatically on each preview deployment and verifies:

1. Header-based bypass returns 200
2. Query-parameter bypass returns 200
3. Response body contains expected content
4. Requests without the secret are still blocked

## BDD Tests & Living Documentation

The project uses [playwright-bdd](https://github.com/vitalets/playwright-bdd) to maintain executable Gherkin specifications that double as living documentation. Feature files live in `/features/` and describe the application's core behaviours (authentication, game mechanics, score persistence).

### Prerequisites

- Node.js 20+
- npm

### Install dependencies

```bash
npm install
npx playwright install --with-deps chromium
```

### Run tests locally

Against a Vercel preview (or production) URL:

```bash
BASE_URL=https://your-preview-url.vercel.app \
VERCEL_AUTOMATION_BYPASS_SECRET=<secret> \
npm test
```

Against a local server:

```bash
npx serve . &          # serve the static site on localhost:3000
BASE_URL=http://localhost:3000 npm test
```

### View the living documentation

After a test run, open the generated Cucumber HTML report:

```bash
open cucumber-report/index.html
```

The report is also published to **GitHub Pages** on every push to `main` and available as a downloadable CI artifact on every PR.

### Add new features or scenarios

1. Create or edit a `.feature` file in `/features/` using Gherkin syntax.
2. Implement any new step definitions in `/features/steps/`.
3. Run `npm test` to generate test files and execute.

### CI workflow

The `.github/workflows/bdd-tests.yml` workflow:

- Runs BDD tests against Vercel preview deployments on each PR
- Runs BDD tests against the production URL on pushes to `main`
- Uploads the living documentation HTML as a CI artifact
- Deploys living documentation to GitHub Pages on `main` merges
