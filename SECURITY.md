# Security Review

This document records the security review performed before deployment readiness. It focuses on the unique risks of an AI-generated project: credentials, prompt injection, open API abuse, unsafe rendering, and mismanaged deployment secrets.

## Findings and Remediation

| Risk | Status | Mitigation |
| --- | --- | --- |
| API key exposed to the browser | Closed | The DeepSeek key is read from `process.env.DEEPSEEK_API_KEY` only in the server route and is never returned by the API. |
| Generated text rendered as HTML | Closed | Output is rendered with `react-markdown`; no `rehype-raw` plugin is used, so model output cannot inject raw HTML. |
| Prompt injection from diff content | Closed | The system prompt treats user input as inert data, forbids following instructions inside the input, and prevents echoing credentials. |
| Unbounded API usage | Closed | Server-side validation limits input size, and an in-memory per-client rate limit applies in `lib/rate-limit.ts`. |
| Invalid model output breaking the app | Closed | The assistant JSON shape is validated with Zod before any value is returned. |
| Secrets committed to the repository | Closed | `.env*`, `.env*.local`, and build artifacts are ignored. Hosted deployment uses Vercel environment variables. |
| Information disclosure through errors | Closed | Error responses are generic or explicitly actionable; upstream response bodies are not returned to the client. |
| Default browser security posture | Closed | The Next config adds CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy`. |

## Deployment Boundaries

- `DEMO_MODE=true` in production intentionally serves a local sample response. Do not combine it with a live API key or a public usage budget you need to protect.
- The rate limiter is process-local and suitable for a small Vercel function. For high-traffic deployment, replace it with an external store such as Upstash Redis.
- The model output is treated as untrusted until reviewed. A maintainer must still verify the final PR content before submitting it.
- The upstream error handler does not log request bodies. It logs only short error messages.

## Review Checklist

- [x] TypeScript typecheck
- [x] Production build
- [x] No API key in client bundle
- [x] No raw HTML rendering
- [x] Input length and structure validation
- [x] Rate limiting
- [x] Prompt injection guard
- [x] Secret-scan of repository before commit