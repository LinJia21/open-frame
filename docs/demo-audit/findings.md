# 预生成分析数据问题清单

命令：`node scripts/demo-audit/audit.mjs`

本次输出：`high=0` `medium=3` `low=9` `info=4`，退出码 1。下面每条都能在那次输出里对上。脚本不访问外链，所以没有判断某个 https 地址现在是否打得开。

## 中

### COVERAGE_WINDOW

- 文件：`spec/data/demo-dataset.json`
- id：`art_demo_ev_02`
- 证据：`research_report.metadata.coverage_window` 是 `2026-03-01` 到 `2026-04-15`。`art_demo_ev_02`（Animation History Archive，证据专用）的 `publication_date` 是 `2025-06-01`。同一份夹具里，其余有日期的文章都落在这个窗口内。真实来源样本的窗口则盖住了每一篇有日期的文章。

### STALE_DEMO_LABEL

- 文件：`src/lib/demo/catalog.ts`（同时出现在 `README.md`、`src/lib/analysis/analyses-http.test.ts`）
- id：名称 `Northlight Studios`。它不在 `spec/data/demo-dataset.json` 里。
- 证据：`preparedTopics` 的第二条标题仍是 “Northlight Studios fictional demonstration”。`selectFixture` 仍用 `northlight` 选择这份虚构夹具。根目录 `README.md` 把这个标题写成打开 `spec/data/demo-dataset.json` 的第二个建议。`spec/README.md` 记录的改名是 Northlight Studios → Plumvale Toonworks，Coastal Courier → Brackenmoor Courier，The Lantern Review → The Quillowick Review。夹具里的出版社是 Plumvale Toonworks、Harbor Trade Daily、Brackenmoor Courier、The Quillowick Review，都带 “(fictional)”。Coastal Courier 和 The Lantern Review 只出现在规格说明的改名记录里，没有再被当成当前标题。

### TRUNCATED_CITATION_URL

- 文件：`spec/data/sample-analysis-ai-animation.json`
- id：`art_variety_amazon_20260527`、`art_deadline_amazon_20260527`、`art_ev_amazon_pr`、`clm_live_08`、`grp_amazon_genai_fund_announcement`、`aud_live_08`、`ev_live_018`、`ev_live_030`、`src_ev_amazon_pr`
- 证据：这些位置共用同一条地址：`http://press.amazonmgmstudios.com/us/en/press-release/prime-video-orders-three-new-animated-series-from-`。路径以连字符结尾。同条记录的标题是 “Prime Video Orders Three New Animated Series from GenAI Creators’ Fund, Backed by Amazon MGM Studios and AWS”，slug 停在 “from-”，标题后面的词没有进路径。这是该样本里唯一的 `http://` 文章地址，其余 `original_url` 都是 `https://`。没有请求这个地址，不能据此说出版社页面不存在。

## 低

### CLAIM_NOT_IN_FINDINGS

- 文件：`spec/data/sample-analysis-ai-animation.json`
- id：`clm_live_10`、`clm_live_14`
- 证据：两条都是 `check_worthy: true`，分别有审核 `aud_live_10`、`aud_live_13`，也在 `key_claim_verification` 里。没有任何 `key_findings[].claim_ids` 指向它们。`clm_live_10` 讲 Critterz / Woven；执行摘要正文提到了 Critterz，但没有对应的 finding id。

### DOUBLE_PERIOD

- 文件：`spec/data/demo-dataset.json`
- id：`aud_demo_02`、`aud_demo_04`、`aud_demo_05`、`aud_demo_06`
- 证据：这四行 `key_claim_verification.one_line_explanation` 以 `..` 结尾。对应的 `audit.explanation` 以一个句号结尾，核验行又加了一个。

### FIXTURE_VERSION_COMMENT

- 文件：`src/lib/analysis/fixture-ids.ts`
- id：`bnd_ai_animation_2026`、`bnd_demo_ai_animation`
- 证据：注释写 “vendored 1.1.0 fixtures”。两份 JSON 的 `schema_version` 都是 `1.2.0`。

### GROUP_ORIGIN_UNLISTED

- 文件：`spec/data/demo-dataset.json`，id `grp_demo_opinion`
- 文件：`spec/data/sample-analysis-ai-animation.json`，id `grp_critterz_producers`
- 证据：两组的 `origin_url` 都是 `null`，而所在 `evidence_audit.missing_fields` 是空数组，没有登记 `origin_url`。同一批数据里，文章上的空作者、空日期写进了 `missing_fields`。

### MOCK_LABELS

- 文件：`src/lib/analysis/cursor-fixture.ts`
- id：`bnd_mockcursor01`（文章 `art_mockcursor01`）
- 证据：这是测试插图，`data_mode` 为 `DEMO`，`analysis_generation` 为 `PRECOMPUTED`，文件头写明不得当作上线夹具。相对官方演示夹具的写法，还有这些缺口：出版社名是 “Example Desk”，不以 “(fictional)” 结尾；标题没有 `[DEMO — fictional]` 前缀；`data_mode_notice` 是 “Illustrative example hosts only.”，没有写预生成；报告 id 是 `rpt_mockcursor01`，规格说明里的前缀是 `rep_`。`fictional_demo_publisher` 仍是 `true`，主机是 `desk.example`。

### SELF_SHARED_SOURCE

- 文件：`spec/data/sample-analysis-ai-animation.json`
- id：`art_variety_cannes_20260515`
- 证据：`dedup.shared_original_sources` 的 url 和 `independence_group_id` 都等于这篇文章自己的 `original_url` 与 `grp_variety_cannes_reporting`。地址能解析到本篇，不是悬空引用；它没有指向另一份原始材料。

### SETTINGS_COUNT_LABEL

- 文件：`src/app/settings/page.tsx`（计数来自 `src/lib/home/feed.ts`）
- id：`bnd_ai_animation_2026`、`bnd_demo_ai_animation`
- 证据：设置页把状态直方图叫「主张计数」。`statusCounts` 按 `evidence_audit.audits` 累加，不按主张累加。真实来源样本是 14 条主张、13 条审核，未计入的意见是 `clm_live_13`。虚构样本是 7 条主张、6 条审核，未计入的意见是 `clm_demo_06`。

### SMALL_SAMPLE_COUNT

- 文件：`spec/data/demo-dataset.json`
- id：`bnd_demo_ai_animation`
- 证据：警告 `SMALL_SAMPLE` 的原文是 “4 fictional articles.” 夹具里有 8 篇文章：4 篇 `analysed`，4 篇 `evidence_only`。数字 4 只等于被分析的子集，句子没有这样写。真实来源样本的同类警告写明了 “8 analysed” 和 “8 evidence-only”，并且和文章数一致。

## 信息

这些不是缺陷。合同允许，列出来是因为校验问题里问到了。

### CLAIM_WITHOUT_EVIDENCE

- `spec/data/demo-dataset.json` / `clm_demo_05`：预测，“Independent animation output will double by 2028.” `check_worthy: true`，审核 `aud_demo_05` 为 Unverified，支持和反对证据都是空的。
- `src/lib/analysis/cursor-fixture.ts` / `clm_mockcursor01`：解释性主张，审核为 Unverified，没有证据。测试夹具的说明就是没有检索到文章。

### OPINION_NOT_AUDITED

- `spec/data/demo-dataset.json` / `clm_demo_06`：意见 “AI animation is a gift to small studios.” `check_worthy: false`，没有审核。
- `spec/data/sample-analysis-ai-animation.json` / `clm_live_13`：意见 “AI should remove friction, not replace judgment.” `check_worthy: false`，没有审核。可读版 markdown 也写了这条被抽出但未审核。

## 核对后没有报问题的部分

- 两份上线夹具内部的文章、主张、证据、审核、来源列表、时间线 `source_ids`、发现和执行摘要 `finding_ids` 都能对上。证据上的 url 和 `data_mode` 等于所引文章。`verified_substring` 的切片等于所引 `accessible_text`。`key_claim_verification` 的状态和置信度等于审核。两份夹具之间没有重复的记录 id。文章 `original_url` 在各自夹具内不重复。
- 真实来源样本：16 篇文章、14 条主张、13 条审核、32 条证据、16 条来源、6 条发现。`data_mode` 为 `LIVE`，`analysis_generation` 为 `PRECOMPUTED`，`schema_version` 为 `1.2.0`。通知同时写了 REAL SOURCES 和 PRE-GENERATED ANALYSIS。`fictional_demo_publisher` 都是 false。`SMALL_SAMPLE` 与 “8 analysed、6 家媒体、3 篇 Variety、8 篇 evidence-only” 一致。6 篇 snippet 来源都出现在 `SNIPPET_ONLY_SOURCES` 里。
- 虚构样本：8 篇文章、7 条主张、6 条审核、9 条证据、8 条来源、3 条发现。`data_mode` 为 `DEMO`，`analysis_generation` 为 `PRECOMPUTED`。出版社名以 “(fictional)” 结尾，标题以 `[DEMO — fictional]` 开头，有 `DEMO_DATA` 警告，url 都在保留域名上。
- `spec/sample-analysis-ai-animation.md` 含有 JSON 里的每条文章 url、每条发现陈述、每条警告和执行摘要，页眉标明真实来源和预生成。
- 首页第三张卡是 `layout-sample`，没有 bundle id，标题里有「虚构」。
- `data/qa/unsupported-schema-bundles.json` 只有 `bnd_schema_999` / `9.9.9`，不是分析包。
- `docs/corpus-import.example.json` 写明不会被载入资料库，url 在保留域名上。

分析页会按 `data_mode` 和 `analysis_generation` 显示 Real Source 或 Demo Source，以及 Pre-generated Analysis。首页卡片用「示例 / 虚构 / 虚构布局样例」和页上的「演示示例 · 非实时」区分，不把规格徽章原文再画一遍。虚构卡的出版社名仍带 “(fictional)”。这是当前首页的写法，没有另记成一条缺陷。

## 已知限制

- 没有请求任何外部 url，因此不能证实真实来源样本里的链接现在可打开，也不能证实报道内容与出版社页面一致。
- 没有用 Ajv 或 Zod。形状和 `checkBundleIntegrity` 仍以 `npm run validate:demo` 为准。
- 测试夹具 `cursor-fixture.ts` 要靠 Node 的类型剥离加载。加载失败时脚本记一条信息 `MOCK_NOT_LOADED`，其余检查继续。
