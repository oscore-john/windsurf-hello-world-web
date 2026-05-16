# ENG-4: Use Protection Bypass for Automation

## Problem

The `windsurf-hello-world-web` project is deployed on Vercel. When Deployment Protection is enabled on Preview deployments, automated tools (CI pipelines, E2E test runners, HTTP health checks, external monitoring) receive `401`/`403` responses and cannot access Preview URLs. Currently there is no mechanism in this repository to bypass Deployment Protection for automation purposes.

Vercel provides a "Protection Bypass for Automation" feature: a per-project secret that can be sent as an HTTP header (`x-vercel-protection-bypass`) or query parameter to grant automated access without disabling Deployment Protection for human visitors.

### Prior Shaping Attempts

Two prior shaping sessions (PRs [#418](https://github.com/oscoreio/huunoo-fe/pull/418) and [#419](https://github.com/oscoreio/huunoo-fe/pull/419)) were incorrectly shaped against `oscoreio/huunoo-fe`. John's feedback confirmed the correct repository is `oscore-john/windsurf-hello-world-web`. Those PRs have been closed. This revision starts fresh against the correct codebase — a minimal static HTML/CSS site with no existing CI/CD, no Playwright configuration, and no test infrastructure.

## Goal

Enable Vercel's Protection Bypass for Automation on the `windsurf-hello-world-web` Vercel project so that automated tools can access protected Preview deployments by presenting the bypass secret, without turning off Deployment Protection.

## Non-Goals

- **Implementing a full E2E test suite** — while the ticket mentions browser-style testing, the scope is limited to enabling the bypass mechanism, not building out Playwright/Cypress infrastructure.
- **Disabling Deployment Protection** — the bypass secret supplements protection; it does not replace it.
- **Production deployment bypass** — this applies to Preview deployments only (Vercel's standard scope for automation bypass).
- **Modifying the application code** (`index.html`, `style.css`) — no functional changes to the site itself.

## Context

### Repository State

| Attribute | Value |
|---|---|
| Repository | `oscore-john/windsurf-hello-world-web` |
| Tech stack | Static HTML/CSS (no framework) |
| Vercel project | `windsurf-hello-world-web` |
| Vercel project ID | `prj_QjXKceNHZQGchKw4Pq3tx93qsDYS` |
| Vercel team | `John Gibbons' projects` |
| Vercel team ID | `team_em8XsEL8VPdH7Hs0sX5thsYt` |
| CI/CD | None (no GitHub Actions workflows) |
| Test infrastructure | None (no Playwright, Cypress, or other test runners) |
| Existing bypass config | None |

### How Vercel Protection Bypass Works

Per [Vercel documentation](https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation):

1. **Generate a bypass secret** in the Vercel project's Deployment Protection settings (dashboard or REST API).
2. **Send the secret** with requests to protected Preview deployments via:
   - HTTP header: `x-vercel-protection-bypass: <secret>`
   - Query parameter: `?x-vercel-protection-bypass=<secret>`
3. **For browser-style testing**, also send `x-vercel-set-bypass-cookie: true` (or `samesitenone` for iframes) to have Vercel set a session cookie so subsequent navigations within the same browser session remain authenticated.
4. Once generated, the secret is also available as the system environment variable `VERCEL_AUTOMATION_BYPASS_SECRET` within Vercel builds.

### REST API for Secret Generation

```
PATCH /v1/projects/{idOrName}/protection-bypass
```

- Endpoint: `https://api.vercel.com/v1/projects/prj_QjXKceNHZQGchKw4Pq3tx93qsDYS/protection-bypass?teamId=team_em8XsEL8VPdH7Hs0sX5thsYt`
- Body: `{}` (generates a new random secret)
- Requires a bearer token with project admin permissions.

## Assumptions

1. **Deployment Protection is (or will be) enabled** on Preview deployments for this project. If it is not yet enabled, the bypass secret is still valid to generate but will have no effect until protection is turned on.
2. **The Vercel MCP integration has sufficient permissions** to call the `PATCH /v1/projects/{idOrName}/protection-bypass` endpoint. If not, this must be done manually via the Vercel dashboard by a team admin.
3. **No GitHub Actions secrets infrastructure exists yet** for this repo. If automation (e.g., a future CI pipeline) needs the bypass secret, it will need to be stored as a GitHub Actions secret or equivalent.
4. **The bypass secret is project-scoped** — it applies to all Preview deployments for the project, not individual deployments.

## Open Questions

> These require human decision before implementation proceeds.

1. **Is Deployment Protection currently enabled on Preview deployments for this project?** If not, should it be enabled as part of this ticket, or is that a separate concern?

2. **How should the bypass secret be stored for consumption?**
   - Option A: Only in the Vercel project settings (available as `VERCEL_AUTOMATION_BYPASS_SECRET` env var in Vercel builds). Sufficient if all consumers run within Vercel.
   - Option B: Also stored as a GitHub Actions secret (e.g., `VERCEL_AUTOMATION_BYPASS_SECRET`) for future CI pipelines to use.
   - Option C: Stored elsewhere (e.g., a shared secrets manager). Specify where.

3. **Should this ticket include adding a minimal CI workflow** (e.g., a GitHub Actions workflow that uses the bypass secret to smoke-test a Preview deployment), or is that out of scope?

4. **Should documentation be added to the repo** (e.g., a `README.md` or `CONTRIBUTING.md` section) explaining how to use the bypass secret for local/automated testing against Preview deployments?

## Acceptance Criteria

1. A Vercel Protection Bypass secret has been generated for the `windsurf-hello-world-web` project (ID: `prj_QjXKceNHZQGchKw4Pq3tx93qsDYS`).

2. An HTTP request to a protected Preview deployment URL with the header `x-vercel-protection-bypass: <generated-secret>` returns a `200` response (not `401`/`403`).

3. An HTTP request to a protected Preview deployment URL with the query parameter `?x-vercel-protection-bypass=<generated-secret>` returns a `200` response.

4. A browser-style request with both `x-vercel-protection-bypass: <secret>` and `x-vercel-set-bypass-cookie: true` headers sets a bypass cookie, and subsequent requests in the same session succeed without the header.

5. Requests to protected Preview deployments **without** the bypass secret continue to receive `401`/`403` (Deployment Protection is not weakened).

6. The bypass secret is stored in the agreed-upon location(s) per Open Question #2.

## BDD Scenarios

```gherkin
Feature: Vercel Protection Bypass for Automation

  Background:
    Given the Vercel project "windsurf-hello-world-web" has Deployment Protection enabled on Preview deployments
    And a Protection Bypass secret has been generated for the project

  Scenario: Automated tool accesses protected Preview via HTTP header
    Given a Preview deployment URL for "windsurf-hello-world-web"
    When an HTTP GET request is made with the header "x-vercel-protection-bypass" set to the bypass secret
    Then the response status code should be 200
    And the response body should contain "Hello, world!"

  Scenario: Automated tool accesses protected Preview via query parameter
    Given a Preview deployment URL for "windsurf-hello-world-web"
    When an HTTP GET request is made with the query parameter "x-vercel-protection-bypass" set to the bypass secret
    Then the response status code should be 200
    And the response body should contain "Hello, world!"

  Scenario: Browser-style testing sets bypass cookie
    Given a Preview deployment URL for "windsurf-hello-world-web"
    When a browser request is made with headers "x-vercel-protection-bypass" and "x-vercel-set-bypass-cookie: true"
    Then the response should set a bypass cookie
    And subsequent requests in the same browser session should return 200 without the bypass header

  Scenario: Unauthenticated request is still blocked
    Given a Preview deployment URL for "windsurf-hello-world-web"
    When an HTTP GET request is made without any bypass header or parameter
    Then the response status code should be 401 or 403

  Scenario: Invalid bypass secret is rejected
    Given a Preview deployment URL for "windsurf-hello-world-web"
    When an HTTP GET request is made with the header "x-vercel-protection-bypass" set to "invalid-secret-value"
    Then the response status code should be 401 or 403
```

## Risks

### Human-Review-Required

1. **Vercel admin access needed**: Generating the bypass secret requires admin-level access to the `windsurf-hello-world-web` project on Vercel. The Vercel MCP integration is connected to team `team_em8XsEL8VPdH7Hs0sX5thsYt` — verify it has sufficient permissions, or a human admin must generate the secret via the Vercel dashboard.

2. **Deployment Protection must be enabled**: The bypass is only meaningful if Deployment Protection is active on Preview deployments. If it is not currently enabled, enabling it changes the accessibility of all Preview URLs — this is a deliberate access-control change that should be confirmed by a human.

3. **Secret rotation policy**: Once generated, the bypass secret is long-lived. Decide whether a rotation policy or expiry mechanism is needed. Vercel supports revoking and regenerating the secret via the same API endpoint.

### Autonomous-Safe

4. **Secret storage**: Storing the secret as a GitHub Actions secret is a standard, low-risk operation that can be done during implementation without additional review.

5. **No code changes required for the core bypass feature**: The bypass is entirely a Vercel platform configuration. The repository's application code (`index.html`, `style.css`) does not need modification.

### Blocking

6. **None identified**: All information needed for implementation is available. The Vercel project and team have been positively identified via the Vercel MCP integration.

## Escalation Conditions

- If the Vercel MCP integration returns `403` when attempting to generate the bypass secret, escalate to a team admin to perform the action via the Vercel dashboard.
- If Deployment Protection is not currently enabled and the decision is to enable it, confirm with the team before proceeding — this affects all Preview URL access.

## Definition of Done

- [ ] Bypass secret generated for Vercel project `prj_QjXKceNHZQGchKw4Pq3tx93qsDYS`
- [ ] Secret stored in agreed-upon location (per Open Question #2)
- [ ] Verified: protected Preview deployment returns 200 with bypass header
- [ ] Verified: protected Preview deployment returns 200 with bypass query parameter
- [ ] Verified: protected Preview deployment still blocks requests without bypass credentials
- [ ] Open Questions #1–#4 answered by reviewer

## Implementation Checklist

> For the implementing agent/developer, once open questions are resolved.

1. **Generate the bypass secret** via Vercel dashboard or REST API:
   ```bash
   curl -X PATCH "https://api.vercel.com/v1/projects/prj_QjXKceNHZQGchKw4Pq3tx93qsDYS/protection-bypass?teamId=team_em8XsEL8VPdH7Hs0sX5thsYt" \
     -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
2. **Store the secret** in the agreed-upon location(s).
3. **Verify header-based bypass**: `curl -H "x-vercel-protection-bypass: <secret>" <preview-url>`
4. **Verify query-parameter bypass**: `curl "<preview-url>?x-vercel-protection-bypass=<secret>"`
5. **Verify cookie-based bypass**: Use a browser or tool that supports cookies to confirm `x-vercel-set-bypass-cookie: true` sets the session cookie.
6. **Negative test**: Confirm unauthenticated requests are still blocked.

## Revision History

| Date | Change | Prompted By |
|---|---|---|
| 2026-05-16 | Initial spec created against correct repository (`oscore-john/windsurf-hello-world-web`). Prior attempts (PRs #418, #419 in `oscoreio/huunoo-fe`) were against the wrong repo and have been closed. | John's feedback: "wrong repo ... in this case its windsurf-demo-hello-world" |
