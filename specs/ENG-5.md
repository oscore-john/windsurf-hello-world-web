# ENG-5: Auth Layer Options Evaluation

## Problem

The `windsurf-hello-world-web` site is a publicly accessible static site deployed on Vercel. Currently, the only access control is Vercel Deployment Protection on Preview deployments (with a bypass secret for automation — see ENG-4). There is no authentication layer protecting the Production deployment or gating access to the site content for authorised users.

This document evaluates options for layering in an authentication mechanism to protect the site, and defines criteria for choosing between them.

## Current State

| Attribute | Value |
|---|---|
| Repository | `oscore-john/windsurf-hello-world-web` |
| Tech stack | Static HTML/CSS/JS (no framework, no build step) |
| Hosting | Vercel |
| Existing protection | Vercel Deployment Protection on Preview deployments only |
| CI/CD | GitHub Actions (`verify-preview.yml`) |
| Custom domain | None (Vercel-assigned URL) |
| Server-side logic | None |

## Evaluation Criteria

The following criteria are used to evaluate each option. They are ordered by priority for this project.

| # | Criterion | Description | Weight |
|---|---|---|---|
| 1 | **Implementation complexity** | How much engineering effort is required to set up and integrate. Does it require changes to the site's tech stack (e.g., adding a framework)? | High |
| 2 | **Compatibility with static sites** | Can it protect a plain HTML/CSS/JS site without requiring a build framework, server-side rendering, or backend? | High |
| 3 | **Security level** | How robust is the protection? Does it resist common bypass techniques (direct URL access, cookie theft, client-side inspection)? | High |
| 4 | **User experience** | What does the login flow look like for end users? Is it seamless, or does it add friction? | Medium |
| 5 | **Cost** | What is the financial cost at the expected scale? Are there free tiers? | Medium |
| 6 | **Maintenance burden** | Ongoing effort to keep the auth layer working — secret rotation, dependency updates, provider management. | Medium |
| 7 | **Identity provider (IdP) support** | Can it integrate with SSO providers (Google, GitHub, Okta, etc.) or is it limited to simple passwords? | Low |
| 8 | **Automation / CI compatibility** | Can automated tools (CI pipelines, E2E tests, monitoring) bypass the auth layer programmatically? | Low |
| 9 | **Scalability** | Does the solution scale if the site grows in traffic or if multiple sites need the same protection? | Low |

---

## Options

### Option A: Vercel Deployment Protection (Standard + All Deployments)

**What it is:** Vercel's built-in Deployment Protection, extended from Preview-only to cover all deployments including Production. Uses Vercel Authentication (requires a Vercel account to view) and/or Password Protection (shared password gate).

**How it works:**
- Toggle "Standard Protection" or "All Deployments" in Project Settings > Deployment Protection.
- Visitors are redirected to a Vercel login page (Vercel Authentication) or a password prompt (Password Protection).
- Automation bypass via `x-vercel-protection-bypass` header (already implemented in ENG-4).

| Criterion | Rating | Notes |
|---|---|---|
| Implementation complexity | **Very Low** | Toggle in Vercel dashboard. No code changes. |
| Static site compatibility | **Excellent** | Platform-level; works with any site. |
| Security level | **Good** | Server-side enforcement by Vercel's edge. Cannot be bypassed client-side. |
| User experience | **Fair** | Vercel Auth requires a Vercel account (awkward for non-technical stakeholders). Password Protection is simpler but shares a single credential. |
| Cost | **Low–Medium** | Vercel Authentication is free on all plans. Password Protection requires Pro plan ($20/mo per team member) or Enterprise. |
| Maintenance burden | **Very Low** | Managed by Vercel. No dependencies to update. |
| IdP support | **Limited** | Vercel Auth only: users must have Vercel accounts. No SSO/IdP integration. |
| Automation compatibility | **Excellent** | Already implemented via bypass secret (ENG-4). |
| Scalability | **Good** | Per-project config; scales with Vercel. |

**Pros:**
- Zero code changes required.
- Already partially implemented (Preview protection + bypass secret).
- Enforced at the edge — no client-side vulnerabilities.
- Automation bypass already in place.

**Cons:**
- Vercel Auth requires visitors to have Vercel accounts — not suitable for non-technical audiences.
- Password Protection is a shared password with no per-user identity.
- Password Protection requires Vercel Pro plan.
- No integration with external identity providers (Google, GitHub SSO, etc.).

---

### Option B: Cloudflare Access (Zero Trust)

**What it is:** Cloudflare's Zero Trust access control product. Places an authentication layer in front of any web application by proxying traffic through Cloudflare's network.

**How it works:**
- Point the site's domain DNS through Cloudflare.
- Create an "Access Application" in Cloudflare Zero Trust dashboard.
- Configure access policies (e.g., allow specific email domains, require IdP login).
- Visitors see a Cloudflare login page before reaching the site.

| Criterion | Rating | Notes |
|---|---|---|
| Implementation complexity | **Medium** | Requires DNS to route through Cloudflare. May conflict with Vercel's DNS/CDN setup. |
| Static site compatibility | **Excellent** | Network-level proxy; completely agnostic to site technology. |
| Security level | **Excellent** | Server-side enforcement at Cloudflare's edge. Supports MFA, device posture checks. |
| User experience | **Good** | Supports SSO login (Google, GitHub, Okta, SAML, etc.). Smooth redirect-based flow. |
| Cost | **Free–Low** | Free plan includes up to 50 users. Paid plans for advanced features. |
| Maintenance burden | **Low** | Managed service. Policy changes via dashboard or Terraform. |
| IdP support | **Excellent** | Supports Google, GitHub, Azure AD, Okta, SAML, OIDC, one-time PIN (email). |
| Automation compatibility | **Good** | Service tokens and service auth for machine-to-machine access. |
| Scalability | **Excellent** | Enterprise-grade. Supports thousands of users and multiple applications. |

**Pros:**
- Rich IdP support — users can log in with Google, GitHub, email OTP, etc.
- Free tier is generous (50 users).
- No changes to site code whatsoever.
- Enforced at the network edge — extremely robust.
- Per-user identity and audit logging.

**Cons:**
- Requires DNS to flow through Cloudflare — potential conflict with Vercel's DNS and CDN.
- Adds a dependency on a second cloud provider (Cloudflare) alongside Vercel.
- Setup requires Cloudflare account and domain configuration.
- Dual-CDN setup (Cloudflare in front of Vercel) can introduce latency or caching quirks.

---

### Option C: Vercel Edge Middleware with Auth Library

**What it is:** Add a Next.js (or similar framework) layer to the project and use Edge Middleware to enforce authentication before serving pages. Auth is handled by a library like Auth.js, Clerk, or a custom JWT check.

**How it works:**
- Migrate the static site to a Next.js project (minimal — just wrapping existing HTML).
- Add a `middleware.ts` (or `proxy.ts` in Next.js 16+) that checks for a valid session cookie.
- Unauthenticated users are redirected to a login page or IdP.
- Session tokens stored as HTTP-only cookies.

| Criterion | Rating | Notes |
|---|---|---|
| Implementation complexity | **High** | Requires migrating to a framework (Next.js). Must set up auth library, session management, and login flow. |
| Static site compatibility | **Poor** | Requires fundamentally changing the project from static HTML to a framework-based app. |
| Security level | **Good–Excellent** | Edge-enforced when deployed on Vercel. Quality depends on auth library choice. Note: Next.js middleware had a bypass vulnerability (CVE-2025-29927). |
| User experience | **Excellent** | Full control over login UI. Supports any IdP, custom branding, MFA. |
| Cost | **Varies** | Auth libraries range from free/open-source (Auth.js) to paid (Clerk: free up to 50K MAU; Auth0: free up to 25K MAU). |
| Maintenance burden | **High** | Must maintain framework, dependencies, auth library updates, and middleware logic. |
| IdP support | **Excellent** | Full control — any OAuth/OIDC/SAML provider. |
| Automation compatibility | **Good** | Can implement API key or service token bypass in middleware. |
| Scalability | **Excellent** | Runs on Vercel's Edge network. Scales automatically. |

**Pros:**
- Full control over authentication flow, UI, and logic.
- Can integrate any identity provider.
- Per-user identity with rich session management.
- Edge-enforced — runs before any page content is served.

**Cons:**
- **Requires migrating to a framework** — a significant change in project architecture and philosophy for what is currently a simple static site.
- High implementation and ongoing maintenance effort.
- Introduces dependencies (Node.js runtime, npm packages, framework updates).
- Overkill for a simple "Hello World" landing page.
- CVE-2025-29927 demonstrated that Next.js middleware-only auth can be bypassed — defence-in-depth is needed.

---

### Option D: Third-Party Auth Gateway (e.g., Auth0, Clerk, WorkOS)

**What it is:** Use a managed authentication service that provides a hosted login page and token verification, without requiring a framework migration. The site redirects unauthenticated users to the provider's hosted login, and the provider redirects back with a token.

**How it works:**
- Sign up for a managed auth provider (Auth0, Clerk, etc.).
- Add a small JavaScript snippet to the site that checks for a valid session token (cookie or localStorage).
- If no valid token, redirect to the provider's hosted login page.
- On successful login, the provider redirects back with a token that the JS stores.

| Criterion | Rating | Notes |
|---|---|---|
| Implementation complexity | **Medium** | Requires adding JS to the site for token checking and redirects. No framework migration needed. |
| Static site compatibility | **Fair** | Works with static sites but auth check is client-side — the HTML/CSS/JS is still served to the browser before the redirect fires. |
| Security level | **Poor–Fair** | **Client-side enforcement only.** The site content is delivered to the browser before JS can redirect. A determined user can disable JS or intercept the response to see the content. Not suitable if the content is genuinely sensitive. |
| User experience | **Good–Excellent** | Polished hosted login pages. SSO support. |
| Cost | **Free–Medium** | Auth0: free up to 25K MAU. Clerk: free up to 50K MAU. WorkOS: free up to 1M MAU for user management. |
| Maintenance burden | **Low–Medium** | Managed service handles IdP, session, and security updates. Must maintain JS integration code. |
| IdP support | **Excellent** | Full SSO/OIDC/SAML support. |
| Automation compatibility | **Fair** | Varies by provider. Some offer API keys or machine tokens. |
| Scalability | **Excellent** | Managed services scale automatically. |

**Pros:**
- No framework migration required.
- Managed auth with polished UX.
- Rich IdP and SSO support.
- Relatively quick to integrate.

**Cons:**
- **Fundamentally client-side** — site content is served before auth runs. This is a security concern if the content is sensitive.
- Requires adding JavaScript to the static site.
- Dependency on a third-party service for core access control.
- Token management in browser storage has its own risks (XSS, token theft).

---

### Option E: HTTP Basic Auth via Vercel Serverless/Edge Function

**What it is:** Add a lightweight serverless function or edge function that prompts for HTTP Basic Authentication (username/password) before serving the site.

**How it works:**
- Add a Vercel Edge Function (or use Vercel's basic auth template) that intercepts all requests.
- The function checks for a valid `Authorization: Basic ...` header.
- If missing or invalid, it returns a `401` with `WWW-Authenticate` header, triggering the browser's native login dialog.
- Credentials are checked against environment variables.

| Criterion | Rating | Notes |
|---|---|---|
| Implementation complexity | **Low–Medium** | Vercel provides a [template](https://vercel.com/templates/edge-middleware/basic-auth-password). Requires adding a `middleware.ts` and minimal config. Slightly changes the project structure but does not require a full framework migration. |
| Static site compatibility | **Good** | Works with static content. Requires adding a middleware file and a minimal `package.json`. |
| Security level | **Fair** | Credentials sent as Base64 (not encrypted, but HTTPS mitigates). Shared credentials — no per-user identity. Browser caches credentials for the session. |
| User experience | **Poor** | Browser's native auth dialog is ugly and provides no branding, no "forgot password," no SSO. |
| Cost | **Free** | Uses Vercel's included Edge Function invocations. |
| Maintenance burden | **Very Low** | Minimal code. Credentials managed via environment variables. |
| IdP support | **None** | Username/password only. No SSO. |
| Automation compatibility | **Excellent** | Simple — pass `Authorization` header in HTTP requests. |
| Scalability | **Fair** | Single shared credential. Does not scale to many users with different access levels. |

**Pros:**
- Very lightweight — a single middleware file.
- Free on all Vercel plans.
- Server-side enforcement (edge function runs before content is served).
- Easy for CI/automation to pass credentials.

**Cons:**
- Poor user experience (browser native dialog).
- No per-user identity — shared username/password.
- No SSO or IdP integration.
- Must add a minimal project configuration (`package.json`, middleware file).

---

### Option F: OAuth Proxy / Identity-Aware Proxy (Self-Hosted)

**What it is:** Deploy a reverse proxy (e.g., OAuth2 Proxy, Pomerium, or Ory Oathkeeper) in front of the site that handles authentication before forwarding requests to the origin.

**How it works:**
- Deploy a proxy service (e.g., on a VPS, Docker container, or cloud service).
- Configure it to authenticate users via an IdP (Google, GitHub, etc.) before forwarding to the Vercel URL.
- Users hit the proxy URL instead of the Vercel URL directly.

| Criterion | Rating | Notes |
|---|---|---|
| Implementation complexity | **High** | Requires deploying and managing a separate proxy service. |
| Static site compatibility | **Excellent** | Transparent proxy; site code is untouched. |
| Security level | **Excellent** | Server-side enforcement. Supports modern OAuth/OIDC. |
| User experience | **Good** | SSO login flow with redirect. |
| Cost | **Medium–High** | Requires hosting infrastructure for the proxy. |
| Maintenance burden | **High** | Must maintain proxy infrastructure, TLS certificates, and keep software updated. |
| IdP support | **Excellent** | Full OAuth/OIDC/SAML. |
| Automation compatibility | **Good** | Service accounts and API tokens. |
| Scalability | **Good** | Depends on proxy infrastructure sizing. |

**Pros:**
- Full IdP and SSO support.
- No changes to site code.
- Open-source options available (OAuth2 Proxy, Pomerium).

**Cons:**
- **Requires separate infrastructure** — defeats the simplicity of a static site on Vercel.
- Ongoing operational burden (uptime, updates, TLS).
- Adds latency (extra hop through proxy).
- Overkill for this use case.

---

## Comparison Summary

| Option | Complexity | Static Site Compat. | Security | UX | Cost | IdP Support | Best For |
|---|---|---|---|---|---|---|---|
| **A. Vercel Deployment Protection** | Very Low | Excellent | Good | Fair | Low | Limited | Quick lockdown; internal/team use |
| **B. Cloudflare Access** | Medium | Excellent | Excellent | Good | Free–Low | Excellent | SSO-gated access without code changes |
| **C. Edge Middleware + Auth Lib** | High | Poor | Good–Excellent | Excellent | Varies | Excellent | Full-featured auth for framework apps |
| **D. Third-Party Auth Gateway** | Medium | Fair | Poor–Fair | Good–Excellent | Free–Medium | Excellent | Client-side gating (non-sensitive content) |
| **E. HTTP Basic Auth** | Low–Medium | Good | Fair | Poor | Free | None | Simple, cheap password gate |
| **F. Self-Hosted OAuth Proxy** | High | Excellent | Excellent | Good | Medium–High | Excellent | Teams with existing proxy infrastructure |

---

## Decision Framework

Use the following flowchart to choose:

```
Is the content genuinely sensitive (must not be viewable by unauthorised users)?
  |
  +-- NO --> Is any gating needed at all?
  |            |
  |            +-- YES (soft gate / "keep honest people out")
  |            |     --> Option A (Vercel Deployment Protection) or Option E (Basic Auth)
  |            |
  |            +-- NO --> No auth layer needed
  |
  +-- YES --> Do users need individual identities / SSO?
               |
               +-- NO --> Option A (Vercel Password Protection) or Option E (Basic Auth)
               |
               +-- YES --> Is changing the project's tech stack acceptable?
                            |
                            +-- YES --> Option C (Edge Middleware + Auth Library)
                            |
                            +-- NO --> Is routing DNS through Cloudflare acceptable?
                                        |
                                        +-- YES --> Option B (Cloudflare Access)
                                        |
                                        +-- NO --> Option F (Self-Hosted Proxy)
```

---

## Recommendation

For `windsurf-hello-world-web` specifically, the recommendation depends on the level of protection required:

### Tier 1 — Quick win (recommended starting point)

**Option A: Vercel Deployment Protection — extend to Production**

- Zero code changes.
- Toggle in Vercel dashboard to extend protection to all deployments.
- Use Password Protection (requires Pro plan) for stakeholders without Vercel accounts, or Vercel Authentication for team members who already have Vercel accounts.
- Automation bypass already implemented (ENG-4).
- **Do this first.** It takes minutes and provides server-side protection immediately.

### Tier 2 — If SSO / per-user identity is needed

**Option B: Cloudflare Access**

- Best balance of security, UX, and simplicity for a static site that needs real identity management.
- Free for up to 50 users.
- No code changes to the site.
- The main consideration is whether routing DNS through Cloudflare is acceptable alongside Vercel hosting.

### Not recommended for this project

- **Option C (Edge Middleware):** Migrating a 3-file static site to Next.js purely for auth is disproportionate.
- **Option D (Client-side auth gateway):** Client-side enforcement is fundamentally insecure for content protection.
- **Option F (Self-hosted proxy):** Operational overhead is unjustified for this scale.
- **Option E (Basic Auth):** Viable as a quick-and-dirty solution but UX is poor and it requires adding project config files. Option A achieves the same with less friction.

---

## Open Questions

1. **What level of protection is needed?** Is this a "keep it private during development" concern, or does the site need robust access control for sensitive content?
2. **Who are the intended users?** Team members with Vercel accounts? External stakeholders? General public with login credentials?
3. **Is a Vercel Pro plan available or planned?** Password Protection requires Pro. Vercel Authentication (free) requires users to have Vercel accounts.
4. **Is routing DNS through Cloudflare acceptable?** This is required for Option B (Cloudflare Access) and would mean the site is proxied through Cloudflare before reaching Vercel.
5. **Is there an existing identity provider (Google Workspace, GitHub org, Okta, etc.) that users should log in with?**

## References

- [Vercel Deployment Protection docs](https://vercel.com/docs/deployment-protection)
- [Vercel Password Protection docs](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/password-protection)
- [Vercel Authentication docs](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [Vercel Basic Auth Middleware template](https://vercel.com/templates/edge-middleware/basic-auth-password)
- [Cloudflare Access (Zero Trust) docs](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app)
- [Auth.js (formerly NextAuth)](https://authjs.dev/)
- [Clerk docs](https://clerk.com/docs)
- [CVE-2025-29927 — Next.js middleware bypass](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-cevg)
