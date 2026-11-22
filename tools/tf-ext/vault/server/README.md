# Automatic publishing to the TwistFrame Model Vault: what is possible and how to switch it on

## The exact limitation (verified 2026-11-22)

| Mechanism | Present on the site? | Evidence |
|---|---|---|
| Official publishing API with keys/tokens | **No** | `/api`, `/api/docs`, `/openapi.json`, `/.well-known/*`, `/api/publisher`, `/api/tokens`, `/api/keys` all return 404 |
| Service account | **No** | Nothing in the site's pages or scripts |
| OAuth for third parties | **No** | "Sign in with ChatGPT" is the site's own OpenAI OAuth login (authorization code + PKCE, redirect to the site's `/callback`). It produces a **browser session cookie for the site only**; no token is issued to other apps. Copying that cookie would be session hijacking, so it is not done. |
| Cross-origin calls to the upload endpoint | **No** | `OPTIONS /api/models` returns 405 and no CORS headers. Only the site's own page can post the form. |
| Browser automation with your signed-in session | Possible, but not automatic | Needs your own computer connected to a Claude session with your signed-in browser, every time. No computer is connected now. |
| **Owner-controlled backend endpoint** | **Not yet, but you can add it** | The site already has a backend (`/api/me`, `/api/models` with POST/DELETE and per-user ownership). Whoever builds the site (the ChatGPT site builder you used) can add one of the two methods below. |

**So automatic publishing does not work yet**, and nothing will be claimed until a real end-to-end test passes.

## Two secure options (pick ONE; reference code in `publisher-reference.js`)

### B. GitHub feed: recommended, because there is no secret at all

1. The site pulls one **fixed** URL every ~10 minutes:
   `https://raw.githubusercontent.com/pawanji8229/claude-animated-shorts/vault-feed/vault-feed/feed.json`
2. Claude adds new original models (GLB + preview + entry with sha256) to the `vault-feed` branch of your repository.
3. The site imports any new entry after checking every file's **sha256** and the same limits as the form. It publishes as **TwistFrame Lab** under your account, so you can still Unpublish.
4. Who can publish: only people who can push to your GitHub repository, which is you and the sessions you authorise. There is no inbound upload endpoint and no token to leak.
5. Trade-off: your repository is public, so files on `vault-feed` are visible on GitHub too. That is fine for CC BY 4.0 models you are publishing anyway.

### A. Owner token endpoint (if you prefer not to use GitHub)

1. Add `POST /api/publisher/models` and `GET /api/publisher/status`. They are authorised by a long random token, and the site stores **only the token's SHA-256 hash**.
2. Claude's side: you enter the token **once** in the cloud environment's secure credential form for `twistframe-model-vault.pawanji8229.chatgpt.site`.
   - The egress proxy adds it to requests.
   - It is never in chat, code, git, logs or backup ZIPs; Claude never sees it.
3. Built-in protections: constant-time check, rate limit, strict validation, idempotency on sha256 (no duplicates), no CORS.

## What to paste into the ChatGPT site builder (one time)

> Please add an owner-only automatic import to my TwistFrame Model Vault, using the attached reference
> `publisher-reference.js` (method B: GitHub feed).
> Every 10 minutes, fetch exactly `https://raw.githubusercontent.com/pawanji8229/claude-animated-shorts/vault-feed/vault-feed/feed.json`.
> For each entry whose sha256 is not already in the library:
> - download its model and preview from the same repository branch only;
> - verify the sha256 and the same limits as the Creator studio form (GLB 2.0 ≤ 16 MiB, JPG/PNG ≤ 2 MiB, title ≤ 80, description ≤ 280, licence CC0 1.0 / CC BY 4.0 / CC BY-SA 4.0, creator exactly "TwistFrame Lab");
> - save it as a community model owned by MY account, so Unpublish works.
>
> Add a read-only `GET /api/publisher/feed-status` that returns `{repo, branch, lastSync, imported, errors}`.
> Do not add any public upload endpoint, and do not add CORS headers.

(For method A, replace the request with the "METHOD A" part of the file. Store only the token's hash in the site's configuration, and tell me when it is live; I will then open the secure credential form.)

## After it is installed: the one-time authorisation

Run `node tools/tf-ext/vault/autopublish.mjs status`. It must show the method as installed. Then give the one-time authorisation, for example:

> "I authorise automatic publication of eligible original TwistFrame models to my Model Vault as TwistFrame Lab under CC BY 4.0, using the GitHub feed (or token endpoint). Start with the camouflage house."

Claude then does the following:
1. Records it in `asset-library/vault-registry.json` → `autoPublish: {enabled: true, method, authorisedBy, date, licence, creator}`.
2. Publishes the camouflage house.
3. Verifies it end to end: listed publicly in `/api/models`, and the **public download's sha256 matches** the local file.
4. Re-runs the publish to prove that **no duplicate** is created.

Only after that does it report automatic publishing as working. From then on, MAKE VIDEO publishes each new eligible original model without asking again. You can revoke at any time by saying so; Claude sets `enabled: false`.
