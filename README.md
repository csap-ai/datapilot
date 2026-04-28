# DataPilot

完全开源的 AI 数据库工作台。

这个项目从零开始编写，`Chat2DB` 仅作为产品形态和技术路线参考，不直接复用其代码。目标不是一比一复刻 Navicat Premium，而是构建一个可自部署、可扩展、AI-first 的数据库开发与分析环境。

## 产品方向

- 连接和管理多种数据库。
- 提供现代 SQL 编辑器、执行历史、收藏、结果查看和安全确认。
- 用 AI 辅助生成 SQL、解释 SQL、优化 SQL、修复错误、生成数据文档。
- 内置 Admin Console，用于企业审计、权限治理、策略配置和安全追踪。
- 支持 OpenAI、DeepSeek、Claude、Qwen、Ollama 等 AI Provider。
- 桌面端优先，Web 同源跟进，移动端后续使用 Flutter。
- 保持核心能力完全开源，避免功能阉割。

## 技术栈

- API 服务：Go 标准库 `net/http`，先不引入 Web 框架。
- Web 前端：React、TypeScript、Vite。
- 桌面端：Wails，复用 Go 和 React，避免 Electron 的重量。
- 移动端：Flutter，后续单独启动。
- 仓库：Go workspace + pnpm workspace。

## 规划文档

- `docs/PRODUCT_PLAN.md`：产品功能规划和阶段边界。
- `docs/UX_PRINCIPLES.md`：比 Navicat 更顺手的操作体验原则。
- `docs/ARCHITECTURE.md`：技术架构、桌面端、移动端和 Admin Console 规划。
- `docs/TECH_STACK.md`：已确认的语言、框架、工具和禁止项。
- `docs/PROJECT_STRUCTURE.md`：目录、文件归属和本地-only 配置约定。
- `docs/DEVELOPMENT_SETUP.md`：本地开发环境、Wails CLI 和验证命令。
- `docs/GITHUB_SETUP.md`：GitHub 仓库设置、分支保护、标签和发布规划。
- `docs/WIKI_PLAN.md`：GitHub Wiki 页面规划。
- `docs/DESIGN_SYSTEM.md`：UI 风格、布局和交互方向。
- `docs/CODING_STANDARDS.md`：Go、React、文档和交付规范。
- `docs/NON_FUNCTIONAL_REQUIREMENTS.md`：存储、密钥、插件、备份、性能和安全指标。
- `docs/EXECUTION_PROGRESS.md`：每次执行后的进度和验证记录。
- `docs/TASK_BACKLOG.md`：按里程碑拆分的任务队列。
- `docs/DECISIONS.md`：关键产品和技术决策记录。
- `ROADMAP.md`：里程碑和执行顺序。
- `AGENTS.md`：AI agent 执行规则，适合 GitHub 上追溯。
- `CONTRIBUTING.md`：贡献流程。
- `SECURITY.md`：安全策略。
- `CODE_OF_CONDUCT.md`：社区行为准则。

## 执行方式

公开仓库使用 `AGENTS.md`、`docs/EXECUTION_PROGRESS.md`、`docs/TASK_BACKLOG.md` 和 `docs/DECISIONS.md` 追踪执行。

本地可使用私有 Cursor Skill 辅助推进，但 `.cursor/` 不提交到 GitHub。每次执行都必须读取规划、选择下一项任务、实现、验证，并更新进度、任务队列和决策记录。

## 本地启动

后端：

```bash
pnpm dev:api
```

前端：

```bash
pnpm install
pnpm dev:web
```

前端默认启动在 `http://localhost:5173`，并通过 Vite proxy 访问后端 `http://localhost:8080`。

桌面端：

```bash
pnpm dev:desktop
```

桌面端依赖本机安装 Wails CLI。详见 `docs/DEVELOPMENT_SETUP.md`。

## 当前状态

这是初始骨架版本：

- 已创建轻量 Go API 服务。
- 已创建 `/api/health` 健康检查接口。
- 已创建 React/Vite 前端。
- 已创建 Wails 桌面端骨架。
- 已规划 Admin Console 企业审计和治理能力。
- 已补充产品规划、UX 原则、架构、非功能需求、路线图、任务队列、进度记录和决策记录。

下一步优先进入 Desktop Foundation：跑通 Wails 桌面端、共享 React UI、快捷键、多标签、状态栏和工作区恢复。
