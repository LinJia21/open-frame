# OpenFrame AI

See Beyond the Headlines.

OpenFrame is a prototype for media research. You type a topic, compare how a few outlets frame it, audit the factual claims, and export a structured report.

The default provider is still **demonstration data**. Every prepared analysis is pre-generated (`analysis_generation: PRECOMPUTED`). A separate `cursor` provider can call the Cursor Cloud Agents API. It is off unless you opt in, and a missing key does not fall back to demo. This repository’s tests use a mock transport. They do not show that a live Cursor call succeeded.

The primary topic uses real article links from the Analyst’s sample file. A second topic uses fictional outlets on reserved domains (`data_mode: DEMO`) and shows a **DEMO DATA** mark next to the **Demo Source** badge.

## Run it

`npm run dev` and `npm start` listen on `127.0.0.1:4317`. Set `HOST=0.0.0.0` if another machine on the same network should open the app. From this machine use [http://127.0.0.1:4317](http://127.0.0.1:4317).

```bash
npm install
npm run dev
```

`tsx` depends on `esbuild`, whose postinstall script downloads the platform binary. That script is listed under `allowScripts` in `package.json`. If `npm ci` still warns that the esbuild postinstall is not allowed, the install is still usable; the warning only means that script did not run. Allow `esbuild` in the install policy, or run `npm ci --ignore-scripts=false`.

Production mode:

```bash
npm run build
npm start
```

Other checks:

```bash
npm run lint
npm run build
npm run validate:demo
npm run estimate:tokens
npm test
```

`validate:demo` checks the official fixtures and the bundles the app serves, with Ajv (draft 2020-12, all schemas loaded together) and Zod. The Analyst’s own scripts are:

```bash
node spec/scripts/validate.mjs spec/data/demo-dataset.json spec/data/sample-analysis-ai-animation.json
npx tsx spec/scripts/zodcheck.ts spec/data/demo-dataset.json spec/data/sample-analysis-ai-animation.json
npx tsx spec/scripts/negtest.ts
```

`estimate:tokens` builds the four stage prompts for the primary sample and counts tokens offline with js-tiktoken `o200k_base`. It does not call an API.

Copy `.env.example` to `.env.local` for local settings. The app runs with no key while `ANALYSIS_PROVIDER=demo`. Do not commit `.env.local`.

## What you can do

1. **Home.** Logo, then a search box that only filters the cards on this page, then All, For You, and Locate. Cards are labeled samples. One uses fixture source links, one is a fictional demonstration, and one is a fictional layout sample with no source, date, or analysis page. Heat says there is no data. Verification does not judge the whole event. Fixture counts and the provider note are on Settings. For You and Locate are not enabled. Three bottom icons have no name. Settings is the real entry, and import, search, and Analyze stay on `/library`.
2. **Perspectives.** Article cards and a side-by-side reading of how those articles frame the topic. Each analysed article is read on six dimensions. There is no outlet-leaning tag on an article.
3. **Evidence audit.** Claims with one of five labels: Verified, Partially Supported, Disputed, Unverified, Contradicted. Each claim points at an article id. Each evidence item points at a claim id and an article id.
4. **Research report.** Summary, perspectives, claim table, methodology, limitations, and sources. Download Markdown or JSON, or use Print / Save as PDF.

The first suggested topic is **Is AI-generated Animation Disrupting the Traditional Film and Television Industry?** That opens `spec/data/sample-analysis-ai-animation.json` (real sources, pre-generated analysis). The second suggestion, **Northlight Studios fictional demonstration**, opens `spec/data/demo-dataset.json`. Any other topic returns that fictional file again, with a notice that it is a template and not an analysis of what you typed.

Fixture text is English. The interface follows the language you pick.

You can also open the fixtures directly:

- http://127.0.0.1:4317/analysis/bnd_ai_animation_2026/perspectives
- http://127.0.0.1:4317/analysis/bnd_demo_ai_animation/perspectives

## How a record is labeled

Two spec fields, shown with the labels from `PROVENANCE_BADGES`:

| Badge | Field |
| --- | --- |
| Real Source | `data_mode` `LIVE` |
| Demo Source, plus DEMO DATA | `data_mode` `DEMO` |
| Pre-generated Analysis | `analysis_generation` `PRECOMPUTED` |

`data_mode` says whether a source record is real or fictional. Demonstration briefings stay pre-generated. A Cursor run is labeled as request-time analysis of the saved materials you selected.

## Folder map

- `spec/` — Analyst package 1.2.0, unchanged: schemas, prompts, datasets, and `scripts/`.
- `src/lib/openframe/openframe.ts` and `prompts.ts` — copies of `spec/types/`. Not edited.
- `src/lib/adapters/` — the only place that maps those types onto the screens.
- `src/lib/demo/catalog.ts` — loads the official JSON files and the generic fallback.
- `src/app/api/analyses/` — create and read a briefing.
- `src/app/api/corpus/` — import and search saved historical materials. It does not fetch URLs.
- `src/app/library` — the import, search, and analyze form. `src/app/settings` links there. The other three bottom slots on the home page are unnamed.
- `data/store/analyses.json` — created when you analyze a topic. It stays on this machine.
- `data/corpus/items.json` — saved articles you import. It starts empty and is not committed.

## Cursor provider

`ANALYSIS_PROVIDER=demo` is the default and does not call a model. `ANALYSIS_PROVIDER=cursor` uses the Cursor Cloud Agents API (`POST /v1/agents`, then `GET /v1/agents/{id}/runs/{runId}`), with no repository. The product model is sent explicitly as `grok-4.5`, `effort=medium`, `fast=false`. The server will not switch to another model.

`ANALYSIS_PROVIDER=grok` is retired. The old direct-provider key is not read. See `docs/CURSOR-PROVIDER.md` for setup, rollback, and what a generated briefing is allowed to claim.

`CURSOR_API_KEY` is read only on the server. Outbound calls also require `CURSOR_ANALYSIS_ALLOW_NETWORK=1`. Without that flag the server returns `network_disabled` and does not fetch. Tests never set that flag; they inject a mock transport.

A Cursor briefing is `analysis_generation: LIVE_AI` and uses only saved materials you select. Those citations can keep the URL you imported. The model cannot add a source, claim a live web search, or fill in text you did not save. Prepared demonstration briefings stay `PRECOMPUTED` and separate. The saved library in this draft is empty until you import. See `docs/CORPUS-IMPORT.md`.

The four analysis stages are requested in one agent create so a double-click cannot start two paid runs. A failed run is not retried until you confirm. Confirmation continues the same agent (`POST /v1/agents/{id}/runs`) up to two follow-ups. A local timeout cancels the run.
