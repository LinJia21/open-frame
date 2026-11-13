# 预生成分析数据校验

这份记录只读检查仓库里已经写好的演示数据和分析结果。它不改业务代码，不改 `spec/data` 里的官方样本，也不调用网络或付费接口。

基线是已验收的 `main`（动手时 HEAD 为 `c4ac0829239a80d532922b326ed6f4150d8b568b`）。问题清单见 [findings.md](findings.md)。

## 范围

检查的对象：

| 路径 | 角色 |
| --- | --- |
| `spec/data/sample-analysis-ai-animation.json` | 上线夹具。`data_mode: LIVE`，`analysis_generation: PRECOMPUTED`。`bundle_id` 为 `bnd_ai_animation_2026`。 |
| `spec/data/demo-dataset.json` | 上线夹具。`data_mode: DEMO`，`analysis_generation: PRECOMPUTED`。`bundle_id` 为 `bnd_demo_ai_animation`。 |
| `spec/sample-analysis-ai-animation.md` | 上面那份真实来源样本的可读版本。 |
| `src/lib/analysis/cursor-fixture.ts` | 测试用的预生成插图。文件头写明不得当作上线夹具。 |
| `src/lib/demo/catalog.ts`、`src/lib/home/feed.ts`、`src/app/settings/page.tsx`、`README.md` | 这些数据被界面和说明引用的地方。 |
| `data/qa/unsupported-schema-bundles.json` | 负例，`schema_version` 为 `9.9.9`，不是一份分析。 |
| `docs/corpus-import.example.json` | 导入格式例子，保留域名，不是已保存的报道。 |

没有把 `data/corpus/items.json` 算进范围。README 写明它被 gitignore，仓库里的历史资料库一开始是空的。

## 怎么跑

在仓库根目录：

```bash
node scripts/demo-audit/audit.mjs
```

脚本只用 Node.js 标准库。不需要 `npm install`，不访问网络，不读取密钥。Node 需要能执行 `--experimental-strip-types`，用来离线加载 `cursor-fixture.ts`。本仓库说明里的 Node 来自 Next.js：`>=20.9.0`。当前校验在 Node 22 上跑过。

退出码：

| 码 | 含义 |
| --- | --- |
| 0 | 没有高、中严重度问题。低和信息仍会打印。 |
| 1 | 有高或中严重度问题。当前数据会以 1 退出，这是预期结果，不是脚本崩溃。 |
| 2 | 读不到官方 JSON。 |

同一份检出上，问题列表和 `PASS` 行是稳定的。第一行 `commit:` 跟随当前 `HEAD`，所以提交之后只有这一行会变。

`npm run validate:demo` 仍是官方夹具的 Ajv 与 Zod 检查，结果应含 `PRECOMPUTED`。本脚本不替代它，也不导入 Ajv 或 Zod。

## 严重度

- **高**：引用对不上、同一条 id 重复、真实和虚构标反、预生成被写成实时分析。
- **中**：记录之间对得上，但计数、覆盖窗口、引用字符串或对外名称不一致，演示前需要知道。
- **低**：不打断引用链的文字、注释或标注缺口。
- **信息**：合同允许的情况。记下来是为了回答「主张没有证据」和「意见没有审核」。

## 这次没有改的东西

官方样本、业务代码、`package.json` 都没有改。发现的问题只记在 [findings.md](findings.md) 里。
