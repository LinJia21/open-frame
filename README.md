# OpenFrame AI

协作步骤、给 Agent 的阅读顺序，以及可复制的启动提示在 [CONTRIBUTING.md](CONTRIBUTING.md)。不能让步的规则仍以 [AGENTS.md](AGENTS.md) 为准。

## 中文使用指南

这是本地原型。默认只看准备好的演示数据，不调用模型。下面的命令和变量以仓库里的 `package.json`、`.env.example` 和源码为准。

### 安装

需要 Node.js `>=20.9.0`。这是依赖里的 Next.js 16.4.6 在 `engines` 中声明的版本，本仓库自己的 `package.json` 没有另写 `engines`。

```bash
npm install
```

`tsx` 依赖 `esbuild` 的安装脚本。`package.json` 的 `allowScripts` 允许 `esbuild`。如果 `npm ci` 提示该脚本没跑，安装仍可使用；要让脚本执行，就允许 `esbuild`，或使用 `npm ci --ignore-scripts=false`。

本地配置：

```bash
cp .env.example .env.local
```

`.env.local` 被 gitignore，不要提交。不填密钥也可以跑，因为默认是演示。

### 启动和构建

开发服务器：

```bash
npm run dev
```

`package.json` 把它绑在 `127.0.0.1:4317`。同一台机器上用 `http://127.0.0.1:4317` 打开。需要改监听地址时设置环境变量 `HOST`，例如 `HOST=0.0.0.0`。端口仍是 4317。

生产模式：

```bash
npm run build
npm start
```

`npm start` 同样使用 `127.0.0.1:4317`，并尊重 `HOST`。

其他检查：

```bash
npm test
npm run lint
npm run typecheck
npm run validate:demo
```

`npm test` 使用 mock，不代表真实接口已接通。`validate:demo` 检查预生成样本，结果应是 `PRECOMPUTED`。

### 首页、设置、资料库

- `/` 首页。顺序是 Logo、搜索、All / For You / Locate。搜索提交后只查询订阅里选中的来源标题，不搜资料库，也不抓正文。没提交时仍显示本页示例卡。
- `/settings` 设置。这里有「已保存的历史资料」入口、提供方说明，以及首页没写在卡片上的夹具范围。
- `/library` 资料库。只保留已存资料的导入、检索和分析。
- `/subscribe` 订阅。方案尚未开通。页面下方是「来源关注」：按 7 个分类列出同样的 20 个固定来源，显示各自的 logo 和名称；点击卡片选中或取消，未选中的来源整体变灰。选择只写入当前浏览器的 `localStorage`（键 `openframe_source_subscriptions`），不上传，也不会与来源建立正式订阅。首页搜索默认读取这份选择；没有保存过选择时默认全选。

首页搜索通过 `GET /api/news?q=关键词&sources=bbc,reuters` 请求；来源来自订阅页的选择。来源配置在 `src/lib/sources/catalog.ts`：16 家媒体、1 个调查机构、3 个国际组织，分为 12 个官方 RSS 和 8 个 Google RSS，无需 Key。官方源仅匹配返回列表的标题；Google 使用限定域名查询，关键词会发送给 Google，并过滤有明确日期且早于 3 天的结果。日期未知保持未知，每源最多展示 20 条。

每次最多 4 个外部请求并发、最多排队 40 个；单源等待和请求共用 8 秒超时、响应上限 2 MB，成功或失败均在进程内缓存 15 分钟（队列已满不缓存）。API 全局每分钟最多 10 次请求。仅访问固定 HTTPS 来源和允许的同源/出版方跳转，不抓文章正文。Google 聚合链接不冒充已解析原文；署名与相似标题只是线索，不证明独立性或转载关系，所有结果均未核实、不送 AI，也不会自动存入资料库。

2026-11-13 连通探测中，19 个入口返回 RSS；CNN HTTPS 失败，其 HTTP 列表停在 2023 年，因此不降级抓取。IAEA 的旧 HTTP 文章链接仅规范为同出版方 HTTPS，非标准日期不猜测。连通不等于授权：Google RSS 声明仅限个人非商业阅读器用途，NPR 限个人使用；其他来源也需逐项核对条款。不得把本地接入当作公开产品再利用或 AI 分析授权。

首页上有两张可打开的示例卡，各自进入自己的分析页：

- `http://127.0.0.1:4317/analysis/bnd_ai_animation_2026/perspectives`
- `http://127.0.0.1:4317/analysis/bnd_demo_ai_animation/perspectives`

第三张是虚构布局样例，没有来源、日期和分析链接。底部菜单是首页、资料库、订阅、我的。导入、检索和分析仍在 `/library`。订阅和我的有完整的页面样子；订阅里的方案尚未开通，没有可支付的价格，也不会登录。订阅页下方还可以按分类选择关注的固定来源：只保存在本机浏览器，不上传，也不是方案购买。我的尚未开通：没有账号。设置仍在 `/settings`，从「我的」进入。手机框右上角可以把界面切成简体、繁體或 English。字标仍是 SpectraX。夹具里的报告正文不随这个开关翻译。

### 导入已保存的历史资料

导入是 `POST /api/corpus`。服务器只保存你提交的 JSON，不会打开 URL，也不接付费新闻源。格式说明在 `docs/CORPUS-IMPORT.md`。`docs/corpus-import.example.json` 使用保留域名，导入会被拒绝，不能直接当成功样本。

一条资料大致是：

| 字段 | 要求 |
| --- | --- |
| `event` | 事件名，用于检索，最长 200 字 |
| `outlet` | 报道上的媒体名 |
| `title` | 标题 |
| `publishedAt` | `YYYY-MM-DD` 或带 `Z` 的 UTC 时间；不知道就 `null` |
| `originalUrl` | 公开 `https`。不能带账号、端口、本机或内网地址。`example.com`、`*.example`、`*.test`、`*.invalid` 会被拒绝 |
| `body` / `summary` | 只填你实际拿到的文字。没有就 `null` |
| `completeness` | `full_text` 必须有正文；`summary_only` 必须有摘要且正文为 `null`；`title_only` 只有标题 |
| `syndication` | `original`、`reprint` 或 `unknown`。不填就是 `unknown` |
| `reprintOfUrl` | 只有 `reprint` 可以填。对不上已保存的原链接就保持未知 |
| `fixture` | 真实导入不要填。测试记录才用 `"test"` |

检索是 `GET /api/corpus?q=关键词&event=事件`。资料存在本机 `data/corpus/items.json`，这个文件被 gitignore。删掉它就回到空库。`spec/data` 里的演示样本不受影响。

### 分析前 2000 字

`src/lib/corpus/materials.ts` 里 `EXCERPT_MAX` 是 2000。正文或仅摘要的材料超过这个长度时，分析只纳入前 2000 字。超出部分未纳入分析，不能据此推断完整原文缺乏证据。只有标题的条目可以保存，但不能单独拿去分析。

### 服务端 Cursor 配置

默认 `ANALYSIS_PROVIDER=demo`，不调用模型。要在你自己允许付费的机器上改用 Cursor，才在未提交的 `.env.local` 里写成下面这样。密钥位置留空，不要把真实密钥写进仓库、前端包或日志。

```bash
ANALYSIS_PROVIDER=cursor
CURSOR_API_KEY=
CURSOR_ANALYSIS_ALLOW_NETWORK=
```

产品模型在代码里固定为 `grok-4.5`，参数是 `effort=medium`、`fast=false`。可选变量 `CURSOR_AGENT_MODEL_ID`、`CURSOR_AGENT_EFFORT`、`CURSOR_AGENT_FAST` 只要偏离这些值，服务端就拒绝，不会改用别的模型。`CURSOR_API_BASE` 可选，默认 `https://api.cursor.com`。超时相关的可选变量是 `CURSOR_ANALYSIS_TIMEOUT_MS`（默认 180000）和 `CURSOR_POLL_INTERVAL_MS`（默认 5000）。更细的行为见 `docs/CURSOR-PROVIDER.md`。

### 付费调用开关

两道开关都要显式打开，才会发出网络请求：

1. `ANALYSIS_PROVIDER=cursor`
2. `CURSOR_ANALYSIS_ALLOW_NETWORK=1`

只写了密钥、但没有把第二项设成 `1`，服务端返回 `network_disabled`，不会发请求。缺密钥时返回 `config_not_ready`，不会改用演示数据冒充成功。测试不设置这个开关，只注入 mock。

`ANALYSIS_PROVIDER=grok` 已停用，返回 `retired_provider`。其它无法识别的值返回 `invalid_provider`。

### 排错

| 现象 | 含义 |
| --- | --- |
| `config_not_ready`，HTTP 503 | 选了 `cursor`，但服务器没有读到非空的 `CURSOR_API_KEY` |
| `network_disabled`，HTTP 503 | 密钥可以有，但 `CURSOR_ANALYSIS_ALLOW_NETWORK` 不是 `1` |
| `retired_provider` | `ANALYSIS_PROVIDER=grok`，这个提供方已停用 |
| `invalid_provider` | `ANALYSIS_PROVIDER` 不是 `demo`、`cursor` 或 `grok` |
| 导入 URL 被拒绝 | 地址不是允许的公开 `https`，或用了保留域名 |
| 资料库是空的 | 正常。还没有导入，或 `data/corpus/items.json` 不存在 |

回退演示：把 `ANALYSIS_PROVIDER` 改回 `demo`，并去掉 `CURSOR_ANALYSIS_ALLOW_NETWORK`。

### 现在还没有的部分

- 仓库里的历史资料库是空的。首页卡片是标注过的示例或虚构布局，不是新入库的报道。
- 真实 Cursor 调用没有在这个仓库里验证。`liveCallVerified` 固定为 false。测试通过不等于接口已接通。
- For You 和 Locate 没有开通。没有关注推荐，没有当地检索，页面也不请求定位。
- 订阅和我的没有开通。页面上的方案和登录是停用的，不会扣款，也不会出现登录成功。
- 界面语言记住在 `openframe_lang`。可选简体 `zh`、繁体 `zh-Hant`、英文 `en`。默认简体。繁体只改界面文字，分析请求仍用 `zh`。
- 热度没有数字，界面写「暂无数据」。核实不对整件事下真或假的结论。

### 分支、PR 和合并

一个任务、一个 owner 使用一个分支。不要直接向 `main` 提交或推送。从已经验收的 `main` 起步，改动前确认基线。

完成后开 Pull Request。说明里写范围、测试结果、390 和 1440 的真实页面截图，以及已知缺口。设计由 figma bro 和 Critiquito 复核，PM 汇总后由用户决定。没有明确验收通过，不得合并。不要使用 auto-merge、force-push，或绕过分支保护。

给 Agent 的步骤和 PR 模板见 [CONTRIBUTING.md](CONTRIBUTING.md)。完整硬性规则在 `AGENTS.md`。用户原图如果还不可读，不要猜图里的内容并当成已经按图完成。

## English

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

1. **Home.** Logo, then a search box that only filters the cards on this page, then All, For You, and Locate. Cards are labeled samples. One uses fixture source links, one is a fictional demonstration, and one is a fictional layout sample with no source, date, or analysis page. Heat says there is no data. Verification does not judge the whole event. Fixture counts and the provider note are on Settings. For You and Locate are not enabled. Three bottom icons have no name and cannot be used. Home and Settings are real controls. The note under them links to the library. Import, search, and Analyze stay on `/library`.
2. **Perspectives.** Article cards and a side-by-side reading of how those articles frame the topic. Each analysed article is read on six dimensions. There is no outlet-leaning tag on an article.
3. **Evidence audit.** Claims with one of five labels: Verified, Partially Supported, Disputed, Unverified, Contradicted. Each claim points at an article id. Each evidence item points at a claim id and an article id.
4. **Research report.** Summary, perspectives, claim table, methodology, limitations, and sources. Download Markdown or JSON, or use Print / Save as PDF.

The first suggested topic is **Is AI-generated Animation Disrupting the Traditional Film and Television Industry?** That opens `spec/data/sample-analysis-ai-animation.json` (real sources, pre-generated analysis). The second suggestion, **Plumvale Toonworks fictional demonstration**, opens `spec/data/demo-dataset.json`. Any other topic returns that fictional file again, with a notice that it is a template and not an analysis of what you typed.

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
- `src/app/library` — the import, search, and analyze form for saved text. Home search uses the sources selected on Subscribe (`/subscribe`); Me (`/me`) is named and not open. `src/app/settings` is still the settings page.
- `data/store/analyses.json` — created when you analyze a topic. It stays on this machine.
- `data/corpus/items.json` — saved articles you import. It starts empty and is not committed.

## Cursor provider

`ANALYSIS_PROVIDER=demo` is the default and does not call a model. `ANALYSIS_PROVIDER=cursor` uses the Cursor Cloud Agents API (`POST /v1/agents`, then `GET /v1/agents/{id}/runs/{runId}`), with no repository. The product model is sent explicitly as `grok-4.5`, `effort=medium`, `fast=false`. The server will not switch to another model.

`ANALYSIS_PROVIDER=grok` is retired. The old direct-provider key is not read. See `docs/CURSOR-PROVIDER.md` for setup, rollback, and what a generated briefing is allowed to claim.

`CURSOR_API_KEY` is read only on the server. Outbound calls also require `CURSOR_ANALYSIS_ALLOW_NETWORK=1`. Without that flag the server returns `network_disabled` and does not fetch. Tests never set that flag; they inject a mock transport.

A Cursor briefing is `analysis_generation: LIVE_AI` and uses only saved materials you select. Those citations can keep the URL you imported. The model cannot add a source, claim a live web search, or fill in text you did not save. Prepared demonstration briefings stay `PRECOMPUTED` and separate. The saved library in this draft is empty until you import. See `docs/CORPUS-IMPORT.md`.

The four analysis stages are requested in one agent create so a double-click cannot start two paid runs. A failed run is not retried until you confirm. Confirmation continues the same agent (`POST /v1/agents/{id}/runs`) up to two follow-ups. A local timeout cancels the run.
