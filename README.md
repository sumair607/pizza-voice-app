<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1toyC6huVG_eEzQ8jAcjfrqIKoqEtzDaD

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` in `.env.local` (or `.env`) to your Gemini API key. Example variables are provided in `.env.example`.
3. Run the app:
   `npm run dev`

Server-side Gemini key (recommended):

The app can optionally use a server-side Gemini key (recommended) so your secret is not exposed to browsers. To configure this on Vercel (recommended) or locally:

- Server env name: `GEMINI_API_KEY` (do NOT prefix with `VITE_`).
- Optionally configure `GEMINI_API_URL` if you need a custom API endpoint.

Vercel CLI commands (run in WSL / project root) to set `GEMINI_API_KEY` interactively:

```bash
vercel link               # if not already linked
vercel env add GEMINI_API_KEY preview
vercel env add GEMINI_API_KEY production
```

Notes:
- `VITE_GEMINI_API_KEY` is client-visible (bundled into the browser) and should only be used temporarily. For production, prefer `GEMINI_API_KEY` on the server and use the provided `/api/gemini-proxy` endpoint to make requests without exposing your key.
- After adding envs, redeploy: `vercel --prod --confirm` or merge to `main` if Vercel is connected to Git.

## Shop Keys (Handover)

You can hand over a pre-generated admin key to each shop owner so they can manage their shop's settings. Keys are stored locally in `.shop_keys.json` (this file is intentionally ignored by git).

To export the keys to a readable file you can hand to owners, run the included Node script:

```powershell
node scripts/export_shop_keys.cjs
```

This creates `shop_keys_export.txt` in the project root. Keep that file secure and do not commit it to source control.

If you need to rotate or regenerate a single shop key, edit `.shop_keys.json` and update the shop's `shopInfo.adminKey` in Firestore via the admin UI.

## Security Documentation

Security guidance and example Firestore rules have been moved to `docs/security/`. See `docs/security/FIRESTORE_RULES.md` and `docs/security/SECURITY.md` for recommendations on securing Firestore and handling keys.
