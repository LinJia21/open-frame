<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 协作说明

给队友 Agent 的阅读顺序、分支、测试和 PR 步骤见 [CONTRIBUTING.md](CONTRIBUTING.md)。下面这些规则仍然有效，不要用那份指南替换它们。

队友共用这一份代码库。每个任务、每个 owner 使用自己的分支。禁止直接向 `main` 提交或推送。

从已经验收的 `main` 起步。动手前先确认基线：当前 HEAD、分支，以及这批改动相对哪一次已验收提交。

做完后开 Pull Request，不要直接合并。PR 里写清范围、测试结果、390 和 1440 的真实页面截图，以及已知缺口。设计由 figma bro 和 Critiquito 复核。PM 汇总后，由用户决定。

没有明确验收通过，不得合并。禁止 auto-merge、force-push，以及绕过分支保护。

用户原图目前还不可读。不要臆测图里的内容并当成已经按图完成。

仓库可见范围还在由用户确认。等 PM 正式 publish 之后，才做团队共享。在那之前不改可见性，也不改权限。
