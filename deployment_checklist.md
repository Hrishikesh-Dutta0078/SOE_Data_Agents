# Azure App Service deployment checklist (file upload)

Checklist for deploying the React + Node app to Azure App Service via file upload in the portal.

---

## 1. Single deployable folder

- Build the client: `cd client && npm run build` (output in `client/dist`).
- Deploy the **server** folder as the app root. Put the built client inside it (e.g. `server/public/` = contents of `client/dist`), so one upload contains both API and front-end.

## 2. Server serves the React app

- In `server/index.js`: serve static files from the folder that holds the Vite build (e.g. `express.static('public')`) and add an SPA fallback so `GET /*` returns `index.html` (so client-side routing works).
- Right now the server only has API routes and `GET /` returning JSON; it does not serve the built React app.

## 3. Start command

- **Linux App Service**: In Portal → Configuration → General settings, set **Startup Command** to `node index.js` (or `npm start`).
- **If you deployed without node_modules**: **Linux** — set Startup Command to `npm install --production && node index.js`. **Windows** — there is no Startup Command in the portal; the app **self-installs** dependencies on first run (see §12).
- **Windows App Service**: Add a **web.config** in the server root so IIS uses Node (e.g. iisnode) to run `index.js`. Without it, IIS won’t start your Node app.

## 4. Port

- Keep using `process.env.PORT` (you already do). Azure sets `PORT`; no change needed.

## 5. Environment / secrets

- **Do not** upload `server/.env` or commit it. Add `server/.env` to `.gitignore` if it isn’t already.
- In Portal → App Service → **Configuration → Application settings**, add every variable from `.env` (e.g. `AZURE_ANTHROPIC_*`, `DB_*`, `PORT`, `ALLOWED_ORIGINS`). Azure injects these as environment variables.

## 6. ALLOWED_ORIGINS

- Set `ALLOWED_ORIGINS` in Application settings to your App Service URL, e.g. `https://<your-app-name>.azurewebsites.net` (and the same with `http` if you use it). No trailing slash.

## 7. Client API base URL

- Your client uses `BASE_URL = ''`, so it uses relative `/api/...` requests. That’s correct when the same App Service serves both the React app and the API; no change needed.

## 8. What to upload

- From the **server** directory (with the built client inside it, e.g. under `public/`):
  - All server source (e.g. `index.js`, `config/`, `routes/`, etc.).
  - `package.json` and `package-lock.json`.
  - **node_modules** (run `npm install --production` in that folder, then zip the folder and upload), **or** rely on Azure build (if you use “Run from package” or a build step that runs `npm install`).
- Do **not** include `server/.env` in the zip.

## 9. Node version (required when deploying without node_modules)

- **Set the App Service Node version to 18 LTS or 20 LTS before deploying without node_modules.** If you don’t, the app may run under an old default Node (e.g. 0.6) and in-app `npm install` will fail (TLS error or "npm not found next to this Node").
- **How to set:** Portal → your App Service → **Configuration** → **General settings** → **Stack settings** → set **Node version** to **18 LTS** (or **20 LTS**). Save, then **Restart** the app. Optionally add Application setting **WEBSITE_NODE_DEFAULT_VERSION** = **18-lts**. Then redeploy (without node_modules).
- **Azure Windows slim runtime:** Node 22 (and some other versions) on Windows App Service may not include npm (`npm-cli.js exists: false`). In that case in-app install cannot run; **deploy with node_modules** or use a build pipeline that runs `npm install` before deploy.
- In `server/package.json` the `"engines": { "node": ">=18" }` hints the required runtime; the Azure stack setting is what actually selects it.

## 10. Database connectivity (Windows auth)

- If the DB allows only certain IPs, add **Azure App Service outbound IPs** (or your deployment IP) to the firewall. For Azure SQL, enable “Allow Azure services” if appropriate.
- The app uses **Windows Integrated Authentication**. In Application settings set: `DB_SERVER`, `DB_PORT`, `DB_DATABASE`, and `DB_TRUST_SERVER_CERT=true` (if needed). The app identity must have access to SQL Server.

## 11. "Cannot find module 'dotenv'" (or any module) after deploying without node_modules

- You deployed without `node_modules` and the server never ran `npm install`. **Windows App Service** has no Startup Command in the portal. The server **index.js** now runs `npm install --production` automatically on first start when `node_modules` is missing (so dependencies are installed). Redeploy the latest code and restart the app; the first start may take 1–2 minutes. **Linux**: set Startup Command to `npm install --production && node index.js`.
- **Azure Windows:** The app invokes the **same Node’s npm** (the one running the app), not the system PATH. You must set the App Service to **Node 18 LTS** (or 20 LTS) as in §9; if the app runs under an old Node (e.g. 0.6), in-app npm install will fail with a TLS error and the startup code will throw a clear “Node too old” message.

---

**Summary:** Build React → put build in server (e.g. `public/`) → serve static + SPA fallback in Express → add web.config on Windows (or set startup command on Linux) → move all config to Application settings and leave `.env` out of the upload.
