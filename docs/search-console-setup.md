# BabyPeek.io — Search Console Setup Guide

**Domain:** babypeek.io
**Purpose:** Get BabyPeek indexed by Google and Bing (critical — Bing Webmaster Tools feeds ChatGPT's search data)
**Research Date:** March 22, 2026

---

## Why Both Google AND Bing?

- **Google Search Console:** Standard. Gets BabyPeek into Google search results.
- **Bing Webmaster Tools:** Critical for AI search. Microsoft's index powers:
  - Bing search (obviously)
  - **ChatGPT's web search data** (Microsoft has $10B+ investment in OpenAI — Bing's index feeds ChatGPT's real-time information)
  - DuckDuckGo, Ecosia, and other search engines that use Bing's index

**Bottom line:** Getting indexed by Bing = getting indexed by ChatGPT's browsing mode. Do both.

---

## Part 1: Google Search Console Setup

### Step 1.1 — Open Search Console

1. Go to: https://search.google.com/search-console
2. Sign in with your Google account (use the account that owns babypeek.io)
3. Click **"Add property"**
4. Choose property type:
   - **Domain** (babypeek.io) — harder to verify, verifies all subdomains
   - **URL prefix** (https://babypeek.io) — easier, recommended if you're sure about the exact URL

> **Recommendation:** Use **URL prefix** (`https://babypeek.io`) for simplicity.

---

### Step 1.2 — Verify Ownership

Google needs to confirm you own the domain. Pick one method:

#### Method A: HTML File Upload (easiest)
1. Download the HTML verification file Google gives you (e.g., `google123456789.html`)
2. Upload it to the root of your site: `babypeek.io/google123456789.html`
3. Click **"Verify"**
4. Done!

> **Note:** If you use Vercel, upload the file to your `public/` folder and redeploy.

#### Method B: DNS Record (best for domain-level)
1. In Search Console, select **"Domain"** property type
2. Add a TXT record to your DNS:
   - **Name/Host:** `@` (or leave blank)
   - **Type:** `TXT`
   - **Value:** The TXT record Google gives you (looks like `google-site-verification=...`)
3. Wait 1–24 hours for DNS propagation
4. Click **"Verify"**

#### Method C: Google Tag (if using Google Analytics)
If you already have Google Analytics on the site, you can verify via the GA measurement ID. Faster but depends on GA being installed.

---

### Step 1.3 — Submit Sitemap

1. In Search Console, go to **"Sitemaps"** (left sidebar)
2. In the "Add a sitemap" box, enter your sitemap URL:
   - Usually: `sitemap.xml` (at root)
3. Click **Submit**
4. Check the status — it should show "Success" with a count of discovered URLs

> If BabyPeek's sitemap is at a different path (e.g., `https://babypeek.io/sitemap.xml`), use that URL instead.

---

### Step 1.4 — Request Indexing for Key Pages

After submitting the sitemap, request indexing for the most important pages:

1. Go to **"URL Inspection"** (top search bar)
2. Enter each key URL and click **"Request Indexing"**:

**Priority 1 — Submit now:**
- `https://babypeek.io/` (homepage)
- `https://babypeek.io/pricing`
- `https://babypeek.io/how-it-works`
- `https://babypeek.io/faq`

**Priority 2 — After those pages exist:**
- `https://babypeek.io/blog` (when blog is live)
- `https://babypeek.io/examples` (when examples page is live)
- `https://babypeek.io/for-clinics` (when clinics page is live)

> Google will notify you in Search Console when each page is indexed (usually 1–7 days, sometimes faster for established domains).

---

## Part 2: Bing Webmaster Tools Setup

**Why this matters:** Bing's index powers ChatGPT's real-time web browsing. Getting BabyPeek into Bing = getting into ChatGPT's knowledge base.

### Step 2.1 — Access Bing Webmaster Tools

1. Go to: https://www.bing.com/webmasters
2. Sign in with a Microsoft account (create one at outlook.com if you don't have one)
3. Click **"Add Site"**

---

### Step 2.2 — Add Your Site

1. Enter: `https://babypeek.io`
2. Click **Add**
3. Choose verification method:

#### Method A: XML File Upload (easiest)
1. Download the Bing verification HTML file
2. Upload it to `babypeek.io/bing123456789.html` (in `public/` folder on Vercel)
3. Redeploy
4. Click **Verify** in Bing Webmaster Tools

#### Method B: DNS Record (cleaner)
1. Add a TXT record to your DNS:
   - **Name/Host:** `@`
   - **Type:** `TXT`
   - **Value:** The Bing verification string (looks like `BingSiteAuth=...`)
2. Wait for DNS propagation (1 min to 24h)
3. Click **Verify**

#### Method C: Meta Tag
Add the Bing verification meta tag to your site's `<head>` section:
```html
<meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE" />
```
Then redeploy. This is the cleanest method if you have access to the code.

---

### Step 2.3 — Submit Sitemap

1. In Bing Webmaster Tools, go to **"Sitemaps"** (under your site)
2. Enter your sitemap URL: `https://babypeek.io/sitemap.xml`
3. Click **Submit**
4. Bing will crawl and index your pages (usually faster than Google — 1–3 days)

---

### Step 2.4 — Request Indexing

1. Go to **"URL Inspection"** in Bing Webmaster Tools
2. Enter each key URL
3. Click **"Submit to Bing"** (or "Request Crawl")

**Key pages to submit:**
- `https://babypeek.io/`
- `https://babypeek.io/pricing` (when live)
- `https://babypeek.io/how-it-works` (when live)
- `https://babypeek.io/faq` (when live)

---

### Step 2.5 — Verify Bing Has Indexed BabyPeek

After 1–3 days, search Bing directly:
```
site:babypeek.io
```
You should see BabyPeek's pages appear in Bing results. If they don't, check Bing Webmaster Tools → "Reports & Data" → "Crawl" for any blocking issues.

---

## Part 3: Verify Both Setups

### Check Google
1. Search: `site:babypeek.io` (in Google)
2. Or use Search Console → Performance report

### Check Bing
1. Search: `site:babypeek.io` (in Bing.com)
2. Or use Bing Webmaster Tools → Reports → Index Report

### Check ChatGPT (indirect verification)
After Bing indexes BabyPeek, wait 1–2 weeks then ask ChatGPT:
> "What is BabyPeek.io?"

If it has current knowledge, Bing indexed successfully. If not, it will say it has no knowledge — wait longer or resubmit via Bing Webmaster Tools.

---

## Part 4: robots.txt Check (Before Submitting)

Before submitting to search consoles, verify your `robots.txt` isn't blocking crawlers:

**Go to:** `https://babypeek.io/robots.txt`

It should **NOT** contain:
```
User-agent: *
Disallow: /
```

It **SHOULD** contain:
```
User-agent: *
Allow: /
Sitemap: https://babypeek.io/sitemap.xml
```

If the sitemap URL in robots.txt is different from your actual sitemap location, update it to match.

---

## Quick Checklist

- [ ] Google Search Console: Property added (URL prefix)
- [ ] Google Search Console: Ownership verified (HTML file / DNS / Meta tag)
- [ ] Google Search Console: Sitemap submitted (`sitemap.xml`)
- [ ] Google Search Console: Key pages submitted for indexing
- [ ] Bing Webmaster Tools: Site added
- [ ] Bing Webmaster Tools: Ownership verified (Meta tag recommended)
- [ ] Bing Webmaster Tools: Sitemap submitted
- [ ] Bing Webmaster Tools: Key pages submitted for indexing
- [ ] robots.txt: Not blocking crawlers, contains sitemap URL
- [ ] Wait 1–3 days → verify with `site:babypeek.io` on Bing
- [ ] Wait 1–7 days → verify with `site:babypeek.io` on Google

---

## Troubleshooting

### "Google can't find my sitemap"
- Check the sitemap URL is correct (try `https://babypeek.io/sitemap.xml` directly in browser)
- If the sitemap returns a 404, the SEO Phase 1 sitemap needs to be redeployed
- If the sitemap is in a non-standard location, update robots.txt with the correct path

### "Pages aren't indexing"
- Check `robots.txt` — make sure the page isn't blocked with `Disallow`
- Check no `noindex` meta tag is on the page
- Use "URL Inspection" → "Request Indexing" to force re-crawl
- Bing takes 1–3 days; Google can take up to 7 days

### "Bing verification isn't working"
- DNS TXT records can take up to 24h to propagate
- If using the meta tag method, make sure it's in the `<head>` of the page (not body)
- After adding the meta tag, redeploy the site before clicking Verify

---

## After Setup — Ongoing SEO

Once both consoles are set up:

1. **Monitor Search Performance** weekly in both GSC and Bing Webmaster Tools
2. **Fix coverage errors** immediately (GSC → Pages → Error filter)
3. **Re-submit sitemap** after adding new pages (blog posts, new routes)
4. **Request indexing** for any new high-priority pages within 24h of publishing

BabyPeek's SEO sprint will add more pages over time (blog, pricing, etc.) — resubmit the sitemap after each major page addition.
