# 已保存历史资料的导入格式

这个资料库只保存你已经拿到的报道文字。它不是新闻搜索，也不会在导入时打开 URL。仓库里的资料库是空的。下面的示例故意使用保留域名，导入会被拒绝。请换成你实际保存的公开 https 地址，以及你实际拿到的标题、摘要或正文。不要为了凑样本编造报道，也不要把付费墙后面没拿到的正文写出来。

测试夹具只存在于测试代码，并带有 `"fixture": "test"`。不要把测试夹具放进真实资料库后当成历史新闻。

## 请求

`POST /api/corpus`

```json
{
  "items": [
    {
      "event": "你给这组报道起的事件名",
      "outlet": "报道上印的媒体名",
      "title": "你保存的标题",
      "publishedAt": "2024-01-15",
      "originalUrl": "https://www.fixture-outlet.org/replace-with-the-url-you-saved",
      "summary": "你实际保存的摘要。没有就不要编。",
      "body": null,
      "completeness": "summary_only",
      "syndication": "unknown",
      "reprintOfUrl": null,
      "language": "en",
      "fixture": null
    }
  ]
}
```

同一条 `originalUrl` 再次导入会更新该条，并改变内容哈希。旧的分析任务不会被当作这次资料的结果。

## 字段

| 字段 | 要求 |
| --- | --- |
| `event` | 事件名，用来检索。最长 200 字。 |
| `outlet` | 媒体名，按报道本身填写。不要用国家推断立场。 |
| `title` | 标题。 |
| `publishedAt` | `YYYY-MM-DD` 或带 `Z` 的 UTC 时间。不知道就 `null`。 |
| `originalUrl` | 公开 `https` URL。不能带账号、端口、本机或内网地址。`example.com`、`*.example`、`*.test` 这类保留域名会被拒绝。 |
| `body` | 你实际拿到的正文。没有就是 `null`。 |
| `summary` | 你实际拿到的摘要。没有就是 `null`。 |
| `completeness` | `full_text` 必须有正文。`summary_only` 必须有摘要且正文为 `null`。`title_only` 只能有标题。对不上就拒绝，不会自动补写。 |
| `syndication` | `original`、`reprint` 或 `unknown`。不填就是 `unknown`。 |
| `reprintOfUrl` | 只有 `reprint` 可以填原报道 URL。原报道也在库里时，两者共用一个独立组，转载不算另一家独立媒体。对不上就保持未知。 |
| `savedAt` | 可选。你保存它的 UTC 时间。不填就用服务器收到导入的时间。 |
| `fixture` | 只有测试记录才填 `"test"`。真实导入省略它。 |
| `language` | 可选，默认 `en`。 |

正文超过 2000 字时，分析只使用前 2000 字，并标明被截断。缺的部分不会被写出来。只有标题的条目可以保存，但不能单独拿去分析。

检索是 `GET /api/corpus?q=关键词&event=事件`。空搜索列出资料库，界面会写明这是已保存资料，不是实时互联网搜索。资料库里的媒体数和这次命中的媒体数是两个数字。

回退：删除 `data/corpus/items.json` 就回到空库。`spec/data` 里的演示样本不受影响。把 `ANALYSIS_PROVIDER` 改回 `demo` 就只走演示简报。
