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
