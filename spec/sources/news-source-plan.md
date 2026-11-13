# OpenFrame: news source selection plan (MVP)

Revised on 2026-11-12 (UTC+8) by OpenFrame Analyst. This document changes **no** schema, types, prompts or data. It was written against schema_version 1.1.0. The current contract is **1.2.0** (audit-fix release; see CHANGELOG), and nothing here depends on the 1.2.0 changes, except that adapter-captured text must set `accessible_text_origin` (e.g. `api_response`).

**Founder decisions:**
1. No paid services.
2. During the hackathon, OpenFrame is a **non-commercial** project. The Guardian Open Platform and NYT free APIs may be used, but **only as supplements**.

**Verification tags used below:**
- **[verified: URL]** means I read the term on that official page, or saw it in a live API or feed response, on 2026-11-12. A short quote is given.
- **[unverified]** means I couldn't confirm it from an official source. Treat it as *not* permitted until it is confirmed.

> This is a research summary, not legal advice. It reports what the terms say and does not settle any legal question.

---

## 0. Read this first: terms that limit AI use (applies to the founder decision)

While checking terms for this revision I found that **several sources expressly restrict using their content with AI systems**, even for non-commercial use. This affects how Guardian and NYT can be "supplements". It also affects the publisher-RSS part of the primary pipeline.

| Source | Clause (short quote) | Official page |
|---|---|---|
| **Guardian Open Platform** | Clause 6(g): you will not use OP Content "with any machine learning and/or artificial intelligence technologies to generate any data or content or to synthesise or combine with any other data or content", nor "for any text and data aggregation, analysis or mining purposes (including to generate any patterns, trends or correlations)" | https://www.theguardian.com/open-platform/terms-and-conditions |
| **NYT APIs** | Terms of Use 1(e)(ii): you shall not "use the NYT APIs, or any Content accessed using the NYT APIs or otherwise, to develop a software product or train a machine learning or artificial intelligence (AI) system" | https://developer.nytimes.com/terms |
| **NYT (Terms of Service, which the API terms incorporate)** | Section 4.1(3): no use of Content "in connection with the development or operation of a machine learning or artificial intelligence (AI) system (including any use of the Content for training, fine tuning, or grounding … or as part of retrieval-augmented generation)" | https://help.nytimes.com/hc/en-us/articles/115014893428-Terms-of-service |
| **PMC (Variety, Deadline)** | Section 9: you may not "use the Services, including any content … to train or ground artificial intelligence" nor "use any artificial intelligence systems … to access, acquire, copy, monitor, scrape or aggregate the Services" | https://pmc.com/terms-of-use/ |
| **AWN** | "Not to aggregate, package, spider, collect, display any of the content on this site without the express written consent of AWN." | https://www.awn.com/tos |
| **LA Times** | You may not "incorporate the Content in any database, compilation, archive, cache, or similar medium" … "not to use any data mining, data gathering or extraction method" | https://www.latimes.com/terms-of-service |

**What this means for the design** (recommendations; they need the founder's or project lead's sign-off):
1. **Guardian and NYT run as display-only supplements.** Their content (headline, trail text, abstract, body) must **never** be put into a Grok prompt or used as claim evidence. They can only feed a "Further coverage" panel: unmodified headline, supplied standfirst or abstract, link and required attribution, cached for 24 hours or less. Use `aiInputAllowed: false` in the adapter policy (section 2).
2. **NYT's 1(e)(ii) prohibits using the APIs "to develop a software product"**, which on its face could cover any app. The NYT terms themselves invite you to confirm acceptable use ("If you wish to confirm that your application constitutes an acceptable use of the NYT APIs … register your application with us", 1(d)) and give the address code@nytimes.com (FAQ). **Recommendation: keep the NYT adapter off by default until the project lead has asked NYT and recorded the answer.** I have not contacted NYT.
3. **Publisher pages (PMC, LA Times, AWN) are not cleared as AI input under their terms.** The primary pipeline needs a decision on what content may go to Grok. The options are:
   - (a) Only send sources whose terms allow it: primary sources such as press releases and official notices, openly licensed text such as Wikinews or Cartoon Brew (CC BY-NC 2.5, non-commercial), or text the user pastes in and has the right to use.
   - (b) Get written permission from the publishers.
   - (c) Get a legal opinion on fair use / fair dealing.

   I have changed nothing. The decision belongs to the founder and project lead.
4. **The existing sample fixture** (`data/sample-analysis-ai-animation.json`) holds short excerpts and pre-generated analysis of Variety, Deadline, LA Times and AWN pages. Per this instruction I have **not** changed any data. I recommend the founder review whether those excerpts stay as they are, are cut back to headline, link and our own summary, or are swapped for demo data in public showings.

---

## 1. Source tiers

| Tier | Source | Role | Content may go to the AI? |
|---|---|---|---|
| Primary | **GDELT DOC 2.0 API** | Discovery (URLs, titles, dates, languages) | GDELT's own metadata: yes ("unlimited and unrestricted use"). Headlines are still the publisher's: **[unverified]** |
| Primary | **Publisher RSS** | Discovery plus headline, link, date | Per publisher, see section 4. PMC, AWN and LA Times: **not cleared** |
| Primary | **Primary-source press releases and official notices** (guilds, studios, companies, government) | Evidence for audits | Generally yes for short quotes with attribution. Check each site's terms: **[unverified per site]** |
| Supplement (opt-in) | **Guardian Open Platform** (Developer key) | "Further coverage" display | **No** (OP Terms 6(g)) |
| Supplement (opt-in) | **NYT APIs** (Article Search, Top Stories) | "Further coverage" display | **No** (Terms of Use 1(e)(ii); Terms of Service 4.1(3)) |
| Optional | Wikinews (CC BY), Cartoon Brew (CC BY-NC 2.5) | Openly licensed text | Yes, under the licence terms (attribution; Cartoon Brew non-commercial) |
| Excluded | Google News RSS, NewsAPI.org free plan, Common Crawl, NewsAPI.ai | (see section 6) | n/a |

---

## 2. Architecture: independent adapters with graceful degradation

**Principles:**
- **One adapter per source**, each fully independent. If one adapter fails, nothing else is affected.
- **Enable switches:**
  - A feature flag, e.g. `SOURCE_GUARDIAN_ENABLED=true`.
  - A key check: the adapter runs only if `GUARDIAN_API_KEY` / `NYT_API_KEY` is set on the server.
  - Supplements are **off by default**.
- **Per-adapter timeout:** an `AbortController`, e.g. 8 s.
- **Per-source rate limiter** using the documented limits:
  - GDELT: 1 request per 5 s.
  - Guardian: 1 request/s and 500 requests/day.
  - NYT: 5 requests/min (one every 12 s or slower) and 500 requests/day.
  - RSS: no more than 1 poll per feed per 15 min (our own politeness rule).
- **Circuit breaker per source:** after 3 failures in a row, or any 429, skip the source for a cool-off period (e.g. 10 min, or until the next UTC day for exhausted daily quotas), then try once ("half-open").
- **Graceful degradation:** discovery uses `Promise.allSettled`. If a key is missing, a flag is off, or a call times out, errors or is rate-limited, the pipeline **carries on with the other sources**. The gap is **recorded**, never filled with made-up content:
  - `research_report.metadata.warnings[]`: `{code: "OTHER", message: "Supplementary source 'nyt' skipped: NYT_API_KEY not configured"}`. Use `SMALL_SAMPLE` if coverage drops noticeably.
  - `research_report.errors[]`: `{code: "RATE_LIMITED" | "SOURCE_UNREACHABLE", message, field: "sources.nyt", recoverable: true}`.
  - `research_report.missing_fields[]`: `{field: "sources.guardian", unknown_reason: "fetch_failed" | "not_applicable", note}`.
  - The API success envelope `warnings: string[]` repeats the warnings for the UI.
- **Policy travels with the data.** Each hit carries its source's `SourcePolicy`. The prompt builder **drops** any hit with `aiInputAllowed: false` before building Grok prompts, and the UI renders only the display fields the policy allows.
- **Caching:** use the source's `maxCacheHours` (Guardian 24 h, NYT 24 h) and purge on schedule.

### TypeScript sketch (illustrative; not part of the data contract)

```ts
// lib/sources/types.ts
import type { OpenFrameError } from "@/lib/openframe/openframe";

export type SourceId = "gdelt" | "publisher_rss" | "press_release" | "guardian" | "nyt";
export type Perm = "allowed" | "not_allowed" | "unverified"; // treat "unverified" as not_allowed in the UI

export interface SourcePolicy {
  aiInputAllowed: boolean;               // may this content be sent to the LLM / used as evidence text?
  display: { headline: Perm; summary: Perm; link: Perm; images: Perm; fullText: Perm };
  maxCacheHours: number | null;          // e.g. 24 for Guardian & NYT
  attribution: string | null;            // e.g. "Powered by The Guardian" / "Data provided by The New York Times"
  termsUrls: string[];
}

export interface SourceQuery { q: string; from?: string; to?: string; limit: number }

export interface SourceHit {
  source: SourceId;
  url: string;
  title: string | null;                  // exactly as supplied, never rewritten
  publisher: string | null;
  published_at: string | null;           // ISO 8601
  description: string | null;            // exactly as supplied (only shown if policy allows)
  fetched_at: string;
  policy: SourcePolicy;
}

export type AdapterStatus =
  | "ok" | "skipped_disabled" | "skipped_no_key" | "circuit_open" | "rate_limited" | "timeout" | "error";

export interface AdapterReport { source: SourceId; status: AdapterStatus; hits: number; error?: OpenFrameError }

export interface SourceAdapter {
  id: SourceId;
  tier: "primary" | "supplementary";
  policy: SourcePolicy;
  timeoutMs: number;
  isConfigured(): boolean;               // feature flag && required env var present (server-side only)
  search(q: SourceQuery, signal: AbortSignal): Promise<SourceHit[]>;
}

// lib/sources/run.ts
export async function runDiscovery(
  adapters: SourceAdapter[], q: SourceQuery,
  deps: { limiter: (id: SourceId) => Promise<void>; breaker: { isOpen(id: SourceId): boolean; record(id: SourceId, ok: boolean, status?: number): void } },
): Promise<{ hits: SourceHit[]; reports: AdapterReport[] }> {
  const results = await Promise.allSettled(adapters.map(async (a): Promise<[SourceHit[], AdapterReport]> => {
    if (!a.isConfigured()) return [[], { source: a.id, status: a.tier === "supplementary" ? "skipped_no_key" : "skipped_disabled", hits: 0 }];
    if (deps.breaker.isOpen(a.id)) return [[], { source: a.id, status: "circuit_open", hits: 0 }];
    await deps.limiter(a.id);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), a.timeoutMs);
    try {
      const hits = await a.search(q, ctrl.signal);
      deps.breaker.record(a.id, true);
      return [hits, { source: a.id, status: "ok", hits: hits.length }];
    } catch (e: any) {
      const status: AdapterStatus = ctrl.signal.aborted ? "timeout" : e?.status === 429 ? "rate_limited" : "error";
      deps.breaker.record(a.id, false, e?.status);
      return [[], { source: a.id, status, hits: 0, error: {
        code: status === "rate_limited" ? "RATE_LIMITED" : "SOURCE_UNREACHABLE",
        message: `${a.id}: ${status}`, field: `sources.${a.id}`, recoverable: true } }];
    } finally { clearTimeout(t); }
  }));
  const hits: SourceHit[] = []; const reports: AdapterReport[] = [];
  for (const r of results) if (r.status === "fulfilled") { hits.push(...r.value[0]); reports.push(r.value[1]); }
  return { hits, reports };            // caller maps non-"ok" reports to warnings/errors/missing_fields
}

// Prompt builder guard: only AI-eligible material reaches Grok.
export const aiEligible = (hits: SourceHit[]) => hits.filter((h) => h.policy.aiInputAllowed);
```

---

## 3. Guardian Open Platform (supplement, opt-in)

| Item | Finding | Source and quote |
|---|---|---|
| Tier and cost | Developer key, free, non-commercial; hackathons are named | [verified: https://open-platform.theguardian.com/access/] "This key is for any non-commercial usage of the content, such as student dissertations, hackathons, nonprofit app developers." |
| Rate limits | 1 call/s; 500 calls/day per key | [verified: access page] "Up to 1 call per second", "Up to 500 calls per day"; OP Terms 4(b) "up to 500 requests for OP Content per API key per day" |
| What the API returns | Full text, thumbnails, embedded ads | [verified: https://www.theguardian.com/open-platform/terms-and-conditions] 2(b) "full text content from our publications, together with thumbnail images and embedded advertising" |
| Storage and refresh | Re-request or delete within 24 h | OP Terms 5: "You must either replace (by re-requesting) or delete all OP Content you hold … at least every 24 hours." |
| Attribution | Full headline, byline and copyright; link to the original; "Powered by The Guardian" logo | OP Terms 6(b)(i), (iv) and (vi) |
| No edits | Can't edit, adapt or translate | OP Terms 6(c)(i): "Edit, adapt, translate or otherwise alter the OP Content." |
| AI and text mining | **Prohibited** | OP Terms 6(g), quoted in section 0 |
| End users | Personal, non-commercial only | OP Terms 7(a) |
| Ads | Keep any embedded ads | OP Terms 8(a) |
| One key per website | Yes; don't share the key | OP Terms 1(c), 3(a)(i) and 3(b)(iii) |

**What may be displayed:**

| Field | Status | Basis |
|---|---|---|
| Headline | **Allowed**, full and unaltered, linking only to the full article | 6(b)(i) "Retain the full headline, byline and copyright notice"; 6(c)(vi) headlines may not link "to any content other than the full text of the underlying article" |
| Summary / standfirst (as supplied) | **Allowed** unmodified, within the 24 h rule | 6(a)(i) licence to "Access, copy, publish, distribute and display the OP Content"; 6(c)(i) no edits |
| Our own or AI-written summary of Guardian text | **Not allowed** | 6(c)(i) no adaptation; 6(g)(i)(C) no AI generation from OP Content |
| Link | **Allowed and required** | 6(b)(iv) "Include a link to the original article published on www.theguardian.com" |
| Images | Thumbnails supplied with OP Content: **allowed** as supplied. Other images: **not allowed** on the Developer tier (images, audio and video are listed only under Commercial) | 2(b); access page Commercial tier "Access to article text, images, audio and videos" |
| Full text | **Allowed to display** with logo, ads, attribution and 24 h refresh. **Not** for AI input | 2(b), 5, 6(b), 8(a), 6(g) |

The OP Terms say they were last varied on 25 January 2024, when clause 6(g) was added.

---

## 4. NYT Developer APIs (supplement, opt-in; off until NYT confirms acceptable use)

| Item | Finding | Source and quote |
|---|---|---|
| Non-commercial | Required | [verified: https://developer.nytimes.com/faq] "Our APIs are for non-commercial use only." FAQ #10 counts as commercial "Using our content inside an application that is paid or has a paid tier currently or in the future." |
| Rate limits | 500/day and 5/min per API | [verified: FAQ] "500 requests per day and 5 requests per minute. You should sleep 12 seconds between calls" |
| Software product or AI | **Prohibited** | [verified: https://developer.nytimes.com/terms] 1(e)(ii), quoted in section 0. Terms of Service 4.1(3) explicitly includes "grounding" and "retrieval-augmented generation" |
| Confirm acceptable use | Invited | Terms of Use 1(d): "If you wish to confirm that your application constitutes an acceptable use of the NYT APIs … register your application with us." Contact: code@nytimes.com (FAQ) |
| Attribution | Logo linking to developer.nytimes.com, or the text "Data provided by The New York Times" | [verified: https://developer.nytimes.com/branding] |
| Caching | 24 h or less | Branding (v): "not archive or cache any of the API content for access by users for more than 24 hours after you have finished using the service" |
| No edits | Yes | Branding (i): "not modify or edit any content, headlines, links or metadata included in the API content" |
| Name | Can't use "NYT" in the project name or domain | Branding (vi) |
| One key per app | Yes | Terms of Use 1(c): "You may only create a single API key per application or service" |
| Fields returned | Article Search: `headline`, `snippet`, `byline`, `pub_date`, `web_url`, `multimedia`. Top Stories: `title`, `abstract`, `url`, `byline`, `published_date`, `multimedia` | Public OpenAPI specs in https://github.com/nytimes/public_api_specs (these may be older than the live API: **[unverified as current]**) |

**What may be displayed:**

| Field | Status | Basis |
|---|---|---|
| Headline | **Allowed**, unmodified, with attribution | Branding attribution guidelines and restriction (i) |
| Summary (abstract or snippet as supplied) | **Allowed**, unmodified, with attribution | Same |
| Link | **Allowed and required**; no framing | Branding: "Any URLs that are delivered in the API content must link in each instance to the related New York Times URL … nor may you frame any NYTIMES.COM web page." |
| Images (`multimedia` URLs) | **Unverified, so don't show them.** I found no explicit permission, and the Terms of Service 2.2 forbid display "including framing and inline linking" | https://help.nytimes.com/hc/en-us/articles/115014893428-Terms-of-service |
| Full text | **Not allowed.** The APIs return metadata only, and scraping is prohibited (Terms of Service 4.1(2)) | |
| Times Newswire API | The FAQ mentions it, but it is **not listed** on https://developer.nytimes.com/apis as of today. **[unverified availability]** | |

---

## 5. Publisher RSS (primary discovery): sample publishers

**General rule:** a public RSS feed is **not a licence**. I found no single general authority on RSS reuse, so OpenFrame treats every feed as **link plus unmodified headline, at most**, unless the publisher's terms say more.

| Publisher | Feed (checked live 2026-11-12) | Headline | Summary / description | Link | Images | Full text | AI input | Basis (official page, short quote) |
|---|---|---|---|---|---|---|---|---|
| **Variety** (PMC) | https://variety.com/feed/ | **Allowed** unmodified, with attribution and a working link | **Unverified** (§19 describes feeds of "story headlines"; anything shown must be "as provided") | **Allowed and required** | **Not allowed** | **Not allowed** | **Not allowed** | https://pmc.com/terms-of-use/ §19: "You must use the Content Feeds as provided by PMC, and you may not edit or modify the text, content or links supplied" … "must provide attribution". §14: "You are not permitted to link directly to any image hosted on the Services". §9 (AI), quoted in section 0 |
| **Deadline** (PMC) | https://deadline.com/feed/ | Same as Variety | Same | Same | Same | Same | Same | Same PMC terms (the Terms of Use cover PMC "subsidiaries and affiliates"). That Deadline links to these terms: **[unverified]** |
| **LA Times** | https://www.latimes.com/business/rss2.0.xml, https://www.latimes.com/entertainment-arts/rss2.0.xml (feeds include `content:encoded`) | **Unverified** (no RSS licence found) | **Not allowed** | **Allowed** | **Not allowed** | **Not allowed**, even though the feed carries it | **Not allowed** | https://www.latimes.com/terms-of-service: "If you operate a Web site and wish to link to the Site, you may do so provided you agree to cease such link upon request"; "you may not republish any portion of the Content … or incorporate the Content in any database, compilation, archive, cache" |
| **Cartoon Brew** | https://www.cartoonbrew.com/feed | **Allowed** (non-commercial, attributed) | **Allowed** (non-commercial, attributed) | **Allowed** | **Unverified** (the licence covers "written content" only) | **Allowed** (non-commercial, attributed, CC BY-NC 2.5) | Allowed under CC BY-NC 2.5 (non-commercial) | https://www.cartoonbrew.com/copyright: "The written content on Cartoon Brew is licensed under an Attribution-NonCommercial 2.5 Creative Commons license." The same page footer also says "All Rights Reserved", so confirm before relying on it |
| **AWN** | https://www.awn.com/news/rss.xml | **Not allowed** without written consent | **Not allowed** | **Allowed** | **Not allowed** | **Not allowed** | **Not allowed** | https://www.awn.com/tos: "Not to aggregate, package, spider, collect, display any of the content on this site without the express written consent of AWN." Allowed uses include "Displaying the Content through embedded links" |
| **postPerspective** | https://postperspective.com/feed/ | **Unverified** | **Unverified** | **Unverified** (linking is normally fine, but no terms were found) | **Unverified** | **Unverified** | **Unverified** | No terms-of-use page found. The site footer links only to https://postperspective.com/privacy/ and /privacy-tools/ |

---

## 6. Other sources (unchanged from the previous revision)

- **GDELT DOC 2.0.**
  - Terms: "unlimited and unrestricted use for any academic, commercial, or governmental use of any kind without fee". [verified: https://www.gdeltproject.org/about.html]
  - Coverage: rolling 3-month window, up to 250 records per call. [verified: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/]
  - Rate limit: "Please limit requests to one every 5 seconds". [verified: live API response]
  - Gives metadata and links only.
  - **Don't show GDELT tone as a credibility score.**
- **Wikinews.** CC BY 4.0 from 2024-12-16, CC BY 2.5 from 2005-09-25, public domain before that. [verified: https://en.wikinews.org/wiki/Wikinews:Copyright] Follow the API etiquette: requests in series, informative User-Agent. [verified: https://www.mediawiki.org/wiki/API:Etiquette]
- **Google News RSS: excluded.** The feed's own text says it is for "personal, non-commercial use. Any other use of the feed is expressly prohibited." [verified: live feed]
- **NewsAPI.org: excluded.** The free plan is for "development and testing in a development environment only". [verified: https://newsapi.org/pricing]
- **NewsAPI.ai: not used.** The free quota is a one-off 2,000 searches, then paid plans. [verified: https://newsapi.ai/plans]
- **Common Crawl CC-NEWS: not used.** Too heavy, and the content keeps its publishers' copyright. [verified: https://commoncrawl.org/terms-of-use]

---

## 7. Getting API keys: steps for the project lead

> **No account has been created and nothing has been registered.** Registering accepts legally binding terms (Guardian OP Terms 1(b): "By applying to register for the OP you accept the OP Terms") and needs the project lead's confirmation and accurate details. OpenFrame Analyst did not and will not sign up.

### Guardian Open Platform (Developer key)
1. Read the terms: https://www.theguardian.com/open-platform/terms-and-conditions. Pay particular attention to clauses 5 (24 h), 6(b)–(c) (attribution, no edits) and **6(g) (no AI use)**.
2. Open https://bonobo.capi.gutools.co.uk/register/developer. This is the "Developer" register link on https://open-platform.theguardian.com/access/.
3. Fill in the form. The fields are as observed on 2026-11-12:
   - **Name**, **Email address** and **Confirm email address**. The key is emailed to you.
   - **Educational institution or company name**.
   - **Reason for key**: Student project / Academic research / *Non-commercial app development (including news apps)* / Other.
   - **Please explain briefly how you intend to use this key**. Describe it honestly, e.g. "Non-commercial hackathon prototype; display Guardian headlines with links as 'further coverage'; Guardian content is not used with AI."
   - **Will Guardian content be displayed?** and **how**: Full article / Summary only / Headline only / Only links back to the Guardian's own site / Other. Recommended: *Headline only* or *Only links back*, matching section 3.
   - **Product name**, plus optional Product URL and Company URL.
   - Tick **I accept the Guardian Open Platform terms and conditions**, then press **Register**.
4. Store the emailed key only as the server-side environment variable `GUARDIAN_API_KEY` (see below). Rotate it if it is ever exposed.

### NYT Developer APIs
1. Read https://developer.nytimes.com/terms (note 1(e)(ii)), https://developer.nytimes.com/faq and https://developer.nytimes.com/branding.
2. **Recommended first:** email code@nytimes.com describing OpenFrame (non-commercial hackathon, display-only headline and link, no AI use of NYT content) and ask whether it is acceptable use (Terms of Use 1(d)). The project lead sends this, and the answer should be kept on record.
3. Go to https://developer.nytimes.com, click **Sign In**, then **Create Account** (new user), and complete the prompts. [verified: https://developer.nytimes.com/get-started]
4. User menu, then **My Apps**, then **+ New App**. Enter a name and description. **Don't use "NYT" or "NYTimes" in the app or project name** (Branding (vi)). Click **Create**.
5. On the app's **APIs** tab, turn on only what is needed:
   - **Article Search API**: topic search.
   - **Top Stories API**: optional.
   - **Times Newswire**: not currently listed on https://developer.nytimes.com/apis, so **unverified**; skip it.

   Click **Save**.
6. Copy the key's **value** from the app's **API Keys** section and store it only as the server-side `NYT_API_KEY`. Create only one key per app (Terms of Use 1(c)).

### Handling the keys (both sources)
- **Server-side only:**
  - Put the keys in `.env.local` locally: `GUARDIAN_API_KEY=...`, `NYT_API_KEY=...`, `SOURCE_GUARDIAN_ENABLED=false`, `SOURCE_NYT_ENABLED=false`.
  - **Never** use the `NEXT_PUBLIC_` prefix. Next.js exposes those variables to the browser.
  - Never return a key in an API response, never log it, and never send it to the client.
- `.env.local` is in `.gitignore` (the Next.js default). Check before committing, and never commit keys.
- **Vercel:** Project → Settings → Environment Variables. Add them for Production, Preview and Development as needed. They are encrypted, and changing them needs a redeploy.
- Both terms forbid sharing the key with third parties (Guardian 3(b)(iii); NYT one key per app).

```ts
// app/api/sources/further-coverage/route.ts  (server only; keys never reach the client)
import { NextResponse } from "next/server";
export const runtime = "nodejs";

const GUARDIAN_KEY = process.env.GUARDIAN_API_KEY;               // NOT NEXT_PUBLIC_*
const GUARDIAN_ON = process.env.SOURCE_GUARDIAN_ENABLED === "true" && !!GUARDIAN_KEY;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 200) ?? "";
  const warnings: string[] = [];
  let items: { title: string; byline: string | null; url: string; source: "guardian"; attribution: string }[] = [];

  if (!GUARDIAN_ON) {
    warnings.push("Supplementary source 'guardian' skipped: not enabled or GUARDIAN_API_KEY not configured");
  } else {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const u = new URL("https://content.guardianapis.com/search");
      u.searchParams.set("q", q); u.searchParams.set("page-size", "10");
      u.searchParams.set("show-fields", "headline,byline");      // OP Terms 6(b)(i): keep full headline + byline
      u.searchParams.set("api-key", GUARDIAN_KEY!);               // key added server-side only
      const r = await fetch(u, { signal: ctrl.signal, next: { revalidate: 3600 } }); // well under 24h
      if (r.status === 429) warnings.push("Supplementary source 'guardian' rate-limited; skipped");
      else if (!r.ok) warnings.push(`Supplementary source 'guardian' unavailable (HTTP ${r.status}); skipped`);
      else {
        const j = await r.json();
        items = (j?.response?.results ?? []).map((x: any) => ({
          title: x.fields?.headline ?? x.webTitle, byline: x.fields?.byline ?? null, url: x.webUrl,
          source: "guardian", attribution: "Powered by The Guardian" })); // UI must also show the official "Powered by" logo
      }
    } catch { warnings.push("Supplementary source 'guardian' timed out; skipped"); }
    finally { clearTimeout(t); }
  }
  // Display-only: these items are never passed to the LLM (Guardian OP Terms 6(g)).
  return NextResponse.json({ ok: true, data: items, warnings });
}
```

The endpoint `https://content.guardianapis.com/search` and the parameters `q`, `page-size` (1–50), `show-fields` (`headline`, `byline`, `trailText`, `thumbnail`, `body`…) and `api-key` match the official docs. [verified: https://open-platform.theguardian.com/documentation/search] Do not request `body` while the adapter is display-only.

---

## 8. Open items for the founder and project lead
1. Approve the "display-only, never AI input" rule for Guardian and NYT, or choose another approach.
2. NYT: the project lead asks code@nytimes.com about acceptable use, given Terms of Use 1(e)(ii). Keep `SOURCE_NYT_ENABLED=false` until there's an answer.
3. Decide on AI input from publisher pages (section 0, item 3) and on the existing sample fixture excerpts (section 0, item 4).
4. Confirm the open questions: postPerspective terms, Cartoon Brew image rights and the "All Rights Reserved" footer, LA Times headline display, and press-room terms for each site.
5. OpenFrame stays non-commercial. Any paid tier, ads or paid hosting of NYT, Guardian, PMC, AWN or LA Times content would break those terms (e.g. NYT FAQ #10 "has a paid tier currently or in the future").
