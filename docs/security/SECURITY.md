# Security Notes — pizza-voice-app

This file contains short, practical guidance to keep your deployments safe and simple.

Key handling
- Keep `.shop_keys.json` and `shop_keys_export.txt` out of source control. They are already listed in `.gitignore`.
- Store master copies of shop keys in a secure password manager or an encrypted file (not a plain text repo).
- When handing a key to a shop owner, give them only their shop's key and advise them to keep it secret.

Environment variables
- Use Vite environment variables prefixed with `VITE_` for values that must be available in the browser (for example `VITE_GEMINI_API_KEY`).
- Do not commit `.env` or `.env.local` to the repository. Use `.env.example` to document required variables.

Firestore & backend
- Dont rely on client-side checks for privileged operations (settings updates, key changes). Use server-side checks (Cloud Functions or a small server) for production.
- See `FIRESTORE_RULES.md` for an example ruleset. Adapt those rules to your authentication model.

Operational advice
- Rotate keys only when necessary; if you must revoke a key, update the Firestore `shopInfo.adminKey` via a secure admin process.
- Keep backups of keys offline in a safe location (encrypted drive, password manager).
- Limit logging of secret values. The app will not print admin key values to console.

Simple checklist for local dev and handover
1. Ensure `.shop_keys.json` exists locally and is not committed.
2. Run `node scripts/export_shop_keys.cjs` to produce `shop_keys_export.txt` for handover.
3. Hand the correct key to the shop owner and advise them to change it via a secure admin process if desired.

If you want, I can add a small server-side template (Cloud Function) to rotate keys and perform admin authentication. This is recommended if you sell many shops.
