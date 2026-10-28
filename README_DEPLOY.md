# Sable Circuit: deploy to GitHub Pages

This is a plain static site. There is no build step and no framework. It is served from the **root of the `main` branch** at `https://sable-circuit.com`. All internal links are relative, so they resolve from the domain root.

> Status: prepared locally and tested on a local server only. **Nothing has been deployed, and no form service account has been created yet.**

## What's in the folder

| Path | Purpose |
|---|---|
| `index.html` | Home page: services, budgets, process, trade, FAQ and the inquiry form |
| `privacy/index.html` | Privacy notice, contact disclosure and the privacy-request form |
| `thank-you/index.html` | Form redirect target (`noindex`) |
| `404.html` | Served by GitHub Pages for missing URLs. It sets a `<base>` derived from `SITE_URL` so its links work at any depth |
| `assets/css`, `assets/js`, `assets/fonts`, `assets/brand` | Styles, form script, self-hosted fonts (SIL OFL) and icons |
| `favicon.svg`, `favicon-32.png`, `favicon-16.png`, `favicon.ico`, `apple-touch-icon.png`, `site.webmanifest`, `og-image.png` | Icons and the social sharing image (1200×630) |
| `robots.txt`, `sitemap.xml` | SEO files (they contain the `SITE_URL` token) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are, with no Jekyll processing |

Helper scripts live **outside** the published folder, in `../tools/`:

- `replace_tokens.sh` replaces the tokens below.
- `make_brand_assets.py` regenerates the icons and the OG image with Pillow.

## Tokens to replace once, before publishing

| Token | Where | Replace with |
|---|---|---|
| `SITE_URL` | og:image, JSON-LD, sitemap, robots, form `redirect`, 404 base | The live base URL **without** a trailing slash: `https://sable-circuit.com` |
| `WEB3FORMS_ACCESS_KEY` | `index.html`, `privacy/index.html` (hidden `access_key`) | The access key Web3Forms emails you (see the next section) |

```bash
SITE_URL=https://sable-circuit.com \
WEB3FORMS_KEY=paste-the-key-here \
../tools/replace_tokens.sh .        # run inside the site folder; prints any tokens left over
```

Until the key is in place, the forms refuse to submit and show "This form is not connected yet." Visitors cannot accidentally send data anywhere.

## One-time form setup (Web3Forms)

The forms post to `https://api.web3forms.com/submit`. Web3Forms needs no password or credit card. You enter an email address and it emails you an access key.

1. Open https://web3forms.com and use **Create your Access Key / Create your form**.
2. Enter the lead notification address (the `+sablecircuit` Gmail plus-address agreed privately). This sends one verification email.
3. Open that email and copy the access key.
4. Run `replace_tokens.sh` with `WEB3FORMS_KEY=…`, then commit.
5. Optional, in the Web3Forms dashboard (sign in by email link):
   - Set the data-retention period. The privacy notice states 24 months, and the free plan allows up to 3 years.
   - Check the spam filter settings.

What the integration already does:

- **Subject.** Every notification subject starts with `[Sable Circuit Lead]`. With JavaScript on, the script appends location, experience and name, e.g. `[Sable Circuit Lead] New private inquiry — Dubai · Racing simulator · Name`. Without JavaScript the subject is `[Sable Circuit Lead] New private inquiry`. Privacy requests use `[Sable Circuit Lead] Privacy request`.
- **Spam protection.** There is a hidden `botcheck` honeypot (Web3Forms rejects any submission that fills it), plus Web3Forms' own spam filtering. Free hCaptcha is available but has not been added, because it loads third-party scripts. To add it later, follow the Web3Forms hCaptcha docs and extend the CSP meta tag in `index.html`.
- **Redirect.** Without JavaScript, Web3Forms redirects to `SITE_URL/thank-you/`. With JavaScript, the form submits by `fetch` and shows an inline success state. If the network fails, it falls back to a normal POST.
- **Privacy.** The access key is public by design and does not reveal the inbox. **The personal Gmail address does not appear anywhere in the site source.**
- **Reply-to.** Web3Forms uses the visitor's `email` field as the reply-to.

Free-plan limits, as published 27 Oct 2026:

- 250 submissions per month.
- Submissions are stored for up to 3 years, and the dashboard shows the last 30 days.
- Custom redirect and subject are included.
- "Restrict to domain" is a paid feature.

## Publish on GitHub Pages

1. Create a **public** repository named `sable-circuit` under `mrmream-dotcom`. GitHub Pages on a free account needs a public repo.
2. Copy the **contents** of this folder, including `.nojekyll`, to the repository root and push to `main`.
   ```bash
   git init && git add -A && git commit -m "Sable Circuit site"
   git branch -M main && git remote add origin https://github.com/mrmream-dotcom/sable-circuit.git && git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages → Build and deployment**. Set **Source: Deploy from a branch**, **Branch: `main` / `(root)`**, then **Save**.
4. Wait about one minute, then open `https://sable-circuit.com/`. On the same page, tick **Enforce HTTPS** once it becomes available.
5. Test the live site:
   - Send one real inquiry. You should receive the email with the `[Sable Circuit Lead]` subject. With JavaScript you get the inline success state; with JavaScript disabled you land on `/thank-you/`.
   - Open a missing URL (e.g. `/x/y`) and check that the styled 404 page appears with working links.
   - Paste the home URL into a social-card preview tool to check the OG image.

Everything in the repository is public. That is why the personal email and the deployment notes with private details are kept out of these files.

## Custom domain

The live site is `https://sable-circuit.com`. GitHub Pages publishes the root of `main`, and the `CNAME` file in that root contains `sable-circuit.com`. DNS points the apex at the GitHub Pages `A` records (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`) and `www` at `mrmream-dotcom.github.io`.

Absolute URLs — canonical, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`, form `redirect` values, and the 404 `<base>` — use `https://sable-circuit.com`. Internal links and assets stay relative, so they resolve from the domain root. `robots.txt` and `sitemap.xml` are honoured at that root. `thank-you/` carries `noindex`.

## Security headers

GitHub Pages cannot set custom HTTP headers. Instead:

- Each page carries a `<meta http-equiv="Content-Security-Policy">`. It allows same-origin assets, `api.web3forms.com` for the inquiry form, the Google Ads tag hosts, and the OpenAI measurement pixel (`bzrcdn.openai.com`, `bzr.openai.com`).
- Each page also carries a `referrer` meta tag.
- HTTPS and HSTS come from GitHub on `github.io`.
- `frame-ancestors`, `X-Frame-Options` and `Permissions-Policy` cannot be set from a meta tag. If they are needed, put a CDN such as Cloudflare in front of a custom domain.

## Analytics

The commented **ANALYTICS SLOT** in `<head>` of `index.html` is still unused.

`assets/js/tracking.js` measures a successful private inquiry (not a privacy request). OpenAI's pixel (`DwnbT2kvDPPGfaAL5TMMJH`) sends `lead_created`. Google Ads is wired but skipped until `AW_CONVERSION_ID` and `AW_CONVERSION_LABEL` at the top of that file are both filled in. The same id is the Google `transaction_id` and the OpenAI `event_id`. The thank-you page counts a no-JS inquiry once, then removes `?form=inquiry` so a reload does not count again. The privacy notice describes this.
