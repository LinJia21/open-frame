# 给队友 Agent 的贡献指南

这份文档主要写给**队友用来读仓库、改代码的 Agent**。人只需要复制下面的启动提示。这里是步骤，不是 Git 教材。不能让步的规则以 [AGENTS.md](AGENTS.md) 为准；怎么跑项目以 [README.md](README.md) 为准。

下面写的是仓库里的协作政策。它**不等于** GitHub 上已经打开的 branch protection 或 ruleset。不要去查看后修改权限、可见性或保护开关，也不要为了试探而做一次被禁止的推送。

## 给人的启动提示

把下面整段交给 Agent：

```text
你在已经授权的云端工作区里工作。不要把仓库克隆到我的电脑、另一台机器，或任何未授权的环境。先读 AGENTS.md、CONTRIBUTING.md、README.md。动手前用你的话复述任务范围，并确认基线：当前分支、HEAD、工作区是否干净、相对 origin/main 的位置。不要在 main 上修改或推送。为这个任务单独建分支，不要覆盖别人的分支或未提交改动。按仓库脚本跑 lint、typecheck、test、build 和 validate:demo。界面改动附上 390 和 1440 的真实页面截图。按 .github/PULL_REQUEST_TEMPLATE.md 开 Pull Request，写清范围、测试、截图和已知缺口。开完 PR 就停。不要合并，不要 auto-merge，不要 force-push，不要绕过保护，也不要联系 figma bro、Critiquito 或 PM。设计复核和用户验收都还没发生，除非我明确说已经通过。
```

## 阅读顺序

1. [AGENTS.md](AGENTS.md)。先读文件开头由 Next 生成的规则块，再读协作说明。不要删那个生成块。
2. 本文件。
3. [README.md](README.md) 的中文使用指南，核对命令和「现在还没有的部分」。
4. 只读这次任务点名的目录。`spec/` 是分析合同，任务没要求就不要改。`src/lib/openframe/` 是合同副本，同样不要顺手改。
5. 只有任务涉及提供方或导入时，再读 [docs/CURSOR-PROVIDER.md](docs/CURSOR-PROVIDER.md) 和 [docs/CORPUS-IMPORT.md](docs/CORPUS-IMPORT.md)。

用户原图如果还不可读，不要猜图里的内容并当成已经按图完成。AGENTS.md 里的这句话仍然有效。

## 这个仓库做什么

OpenFrame 是媒体研究原型。默认只看准备好的演示数据，不调用模型。

能用的：

- `/` 首页。搜索提交后只查订阅里选中的来源标题，不搜资料库，也不抓正文。来源在订阅页选择。
- 两张示例卡进入各自的分析页：观点、证据审核、研究报告与导出。
- `/settings` 设置，`/library` 导入、检索、分析表单。

演示，不是实时结果：

- 分析是预生成的。`npm run validate:demo` 的结果应含 `PRECOMPUTED`。
- 首页热度没有数字，界面写「暂无数据」。不要编造热度。
- 核实不对整件事下真或假的结论。

没有开通，不要装成能用：

- For You 没有关注推荐。Locate 没有当地检索，也不请求定位。
- 底部菜单是首页、资料库、订阅、我的。订阅和我的可以有页面样子，但尚未开通：不要做成能付款的套餐或能登录的账号。设置仍在 `/settings`。界面语言是简体、繁體、English，记在 `openframe_lang`，默认 `zh`。
- 仓库里的历史资料库一开始是空的。
- 真实 Cursor 调用没有在这个仓库里验证。`liveCallVerified` 固定为 false。测试通过不等于接口已接通。

## 环境与命令

这些命令对过 `package.json`。本仓库自己的 `package.json` 没有 `engines`。Node 要求来自依赖 Next.js 的 `engines`：`>=20.9.0`。

```bash
npm install
cp .env.example .env.local
npm run dev
```

`npm run dev` 和 `npm start` 监听 `127.0.0.1:4317`。需要改监听地址时才设 `HOST`，例如 `HOST=0.0.0.0`，端口仍是 4317。`http://127.0.0.1:4317` 只是这台机器上的地址，不是公开预览网址。不要把 localhost 写成对外链接。

检查：

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run validate:demo
```

`npm test` 使用 mock，不发付费请求。默认 `ANALYSIS_PROVIDER=demo`。不要提交 `.env.local`、密钥或日志里的密钥。不要把 `CURSOR_ANALYSIS_ALLOW_NETWORK` 设成 `1`，也不要为了完成任务发起真实分析。产品模型保持代码里的 `grok-4.5`、`effort=medium`、`fast=false`。不要改成别的模型。

## 动手前看基线

在已授权的云端工作区里做。工作区里已经有仓库时，不要再克隆到人的电脑。

```bash
git status
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
```

任务依赖最新 `main` 时，再 `git fetch origin main`，并说明你相对哪一次已验收提交。工作区里有不是你做的未提交改动时，停下来报告，不要丢掉或覆盖。

## 分支与权限

- 每个任务、每个 owner 用自己的分支。分支名不要和别人的重复。
- 有写权限：从已验收的 `main` 建分支，只推这个分支，再开 PR。
- 没有写权限：只有 owner 允许 fork 时才 fork 后开 PR。私有仓库的访问只能由 owner 给予。
- 不要改可见性，不要改协作者权限，不要改保护设置。
- 不要在 `main` 上提交或推送。不要覆盖别人的分支。
- 推送被拒绝时，把完整拒绝原因写进汇报并停止。不要 force-push，不要 `--no-verify`，不要绕过 ruleset 或 branch protection。

## 界面改动

跑过上面的检查。再用浏览器走一遍相关页面，不要发起付费调用。至少保留 390 宽和 1440 宽的真实页面截图，放进 PR。截图必须是跑起来的页面，不是设计稿。

## 提交、PR、停在合并前

提交信息写清做了什么。推送你自己的分支。PR 说明用 [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)，至少包括：

- 范围
- 测试结果
- 390 和 1440 截图
- 已知缺口

开完 PR 就停。不要合并，不要 auto-merge，不要帮用户按合并。

设计复核顺序是：figma bro 和 Critiquito，然后 PM 汇总，最后由用户决定。在用户明确验收通过之前，不得合并。不要把复核写成已经完成。不要联系 figma bro、Critiquito、PM，也不要给他们发消息。
