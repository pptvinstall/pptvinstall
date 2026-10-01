# Security and privacy review (Job OS)

| Area | Result |
|---|---|
| Admin auth | All `/api/admin/*` incl. Job OS behind `x-admin-token`; 23 Job OS routes tested 401 without/with wrong token. No hardcoded admin password fallback. |
| Public quote token | Random token; customer-safe whitelist response; runtime `assertSafeCustomer` guard; verified no floor/margin/cost/recommended/reasons. |
| Rate limits | In-memory: 60/min quote view, 10/min accept. Single-instance only; move to shared store if scaled out. |
| Config safety | Config validation rejects secret-like keys; changes versioned and audited; rollback supported. |
| PII | `server/data/bookings.json` is `[]` and listed in `.gitignore` (the file is still tracked as an empty array; untrack with `git rm --cached` at owner convenience). Jobs store only a short customer label. Outbox recipients are masked. |
| Secrets | No keys/tokens/credential URLs found by scan; CI hygiene step enforces it (test URLs refactored to pass it). |
| Staging | Outbound suppressed, AI off, boot guard against production DB host. |
| Logs | Job OS logs carry ids, not customer contact data. |
| Webhooks | No new webhooks added. |

## Known items (owner action)
- Business phone and business email appear in site code by design. The owner's personal email is in legacy test scripts (`test-email-send.js`, `test-gmail-email.js`, `email-template-preview.html`); remove if desired.
- Earlier git history may contain PII from before sanitizing; remediation (history rewrite) is NOT done automatically and needs owner approval.
- Rate limiting is per instance.
