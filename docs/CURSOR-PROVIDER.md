# Cursor 分析提供方：兼容与迁移

这份说明只描述 OpenFrame 的分析提供方。仓库里没有密钥。

## 现在怎么选

| `ANALYSIS_PROVIDER` | 行为 |
| --- | --- |
| `demo`（默认，或留空） | 仍返回准备好的演示简报，`analysis_generation` 为 `PRECOMPUTED`。不调用模型。 |
| `cursor` | 服务端走 Cursor Cloud Agents API。缺密钥时返回 `config_not_ready`（HTTP 503），**不会**改用 demo 冒充成功。 |
| `grok` | 已停用，HTTP 501，`retired_provider`。不再读取原来的直连密钥，也不会发请求。 |
| 其它值 | HTTP 400，`invalid_provider`。 |

旧的 `.env` 里如果还有直连模型的密钥变量，可以删掉。产品不读它，也不读 `CURSOR_AUTH_TOKEN`。唯一会当作凭证读取的是服务器上的 `CURSOR_API_KEY`。

## 产品模型

请求体始终带上模型，不能省略（省略会落到账户默认模型）：

```json
{
  "model": {
    "id": "grok-4.5",
    "params": [
      { "id": "effort", "value": "medium" },
      { "id": "fast", "value": "false" }
    ]
  }
}
```

`CURSOR_AGENT_MODEL_ID`、`CURSOR_AGENT_EFFORT`、`CURSOR_AGENT_FAST` 只要偏离上面的值，服务端就拒绝，并且**不会**自动改用别的模型。grok-4.5 的参数名是 `effort`，不是 `reasoning_effort`。

协议来自 Cursor 公开文档 [Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints)：

- `POST /v1/agents` 创建无仓库 agent（不传 `repos`，也不传 `env`）
- `GET /v1/agents/{id}/runs/{runId}` 轮询
- `POST /v1/agents/{id}/runs` 只在你确认后，对**同一个** agent 发跟进
- `POST /v1/agents/{id}/runs/{runId}/cancel` 超时或你点取消时调用
- 认证是 HTTP Basic：用户名是 API key，密码为空

本草稿的测试用注入的 mock 传输，**没有**做过真实付费调用，也没有调用 `GET /v1/models`。不要把测试通过说成真实 API 已接通。

## 安装与回退

```bash
npm ci
cp .env.example .env.local
```

保持默认即可继续看演示：

```bash
ANALYSIS_PROVIDER=demo
```

要在一台你自己允许付费的机器上打开真实调用，才同时设置：

```bash
ANALYSIS_PROVIDER=cursor
CURSOR_API_KEY=你的密钥
CURSOR_ANALYSIS_ALLOW_NETWORK=1
```

密钥只放在服务器环境或未提交的 `.env.local`。不要写进源码、浏览器包、日志或发行 zip。

回退：把 `ANALYSIS_PROVIDER` 改回 `demo`，并去掉 `CURSOR_ANALYSIS_ALLOW_NETWORK`。已保存的演示简报不受影响。正在跑的 Cursor 任务可以在运行页取消；取消不会删除 `spec/data` 里的预生成样本。

本地开发仍是：

```bash
npm run dev
```

默认监听 `127.0.0.1:4317`。

## 已保存的历史资料

付费新闻源没有接入。Cursor 只分析你导入并选中的资料，不会自己去搜实时互联网，也不会把没拿到的正文补写出来。

资料存在本机 `data/corpus/items.json`（已 gitignore）。仓库里的这份文件是空的，没有预填真实历史新闻。演示简报仍使用 `spec/data` 里的虚构或预生成样本，和资料库分开。

导入格式见 `docs/CORPUS-IMPORT.md`。导入只保存你提交的 JSON，不会抓取 URL。

一次运行的指纹包含选中条目的内容哈希。同一条报道的正文变了，不会复用旧任务。

## 生成结果可以引用什么

通过校验的 Cursor 简报是 `LIVE_AI`，来源是 `LIVE`，但只表示“这些字段来自你保存的材料，分析是请求时生成的”。它不是实时检索，也不是外部事实核验。

服务端会拒绝：

- 坏掉的或不完整的 JSON
- 不在本次选中材料里的链接，以及带账号密码、非 https、内网地址
- 声称抓取了网页，或声称做了外部事实核验
- 引用的原句不在已保存摘录里
- 把密钥回显进输出

文章的标题、媒体、URL 和摘录以资料库为准，模型改不掉。通讯社转载如果能对上已保存的原链接，就共用一个独立组；对不上就保持未知，不用国家猜测立场。

用户题目和资料都放在不可信标记里，只当作数据。

## 计费与重试

同一次题目在未取消、未过期时会复用已有任务，避免双击打出两次创建。失败不会自动再创建。你在运行页确认后，才会在同一个 agent 上跟进，最多 2 次（`MAX_RETRIES`）。本地超时默认 180 秒，到点会取消运行并标成 `expired`。鉴权失败和 429 不会自动再开一次付费创建。

界面会显示处理中、失败和重试。`liveCallVerified` 固定为 false：本仓库不能凭测试宣称已经接通。
