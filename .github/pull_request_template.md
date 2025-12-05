# Restore UI from backup — PR checklist

Summary of changes:

- Restored frontend UI from backup (components, `App.tsx`, styles).
- Moved security docs into `docs/security/` and updated `README.md`.
- Local secret handling: `.shop_keys.json` is git-ignored; stray key files moved locally.

Checklist (required before merge):

- [ ] Add required Vercel environment variables (see `README.md` / `.env.example`).
- [ ] Confirm CI status checks pass (Build).
- [ ] At least 1 approving review.
- [ ] Verify preview deployment (Vercel) and smoke-test key admin flows.

Notes:
- Do not merge if any secret was exposed in commit history — rotate keys first.
- If Vercel build fails, check the build logs and share them for debugging.
