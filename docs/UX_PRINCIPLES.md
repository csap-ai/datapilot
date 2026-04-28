# UX Principles

DataPilot 的体验目标不是复刻 Navicat Premium，而是在高频操作上做到更快、更安全、更懂上下文。

核心原则：

> Less clicking than Navicat, safer than raw SQL, smarter than a chat box.

中文表达：

> 比 Navicat 少点击，比裸写 SQL 更安全，比普通 AI 聊天框更懂数据库上下文。

## 设计关键词

- International：偏国外开发者工具审美，简洁、克制、耐看。
- Minimal：少装饰，减少视觉噪音。
- Dense：信息密度高，但不拥挤。
- Keyboard-first：常用操作必须支持快捷键。
- Dark-mode-first：深色模式优先，同时支持浅色模式。
- Context-aware：界面始终知道当前连接、库、表、SQL、结果和风险。
- Safe-by-default：危险操作默认拦截、解释和确认。

## 主界面结构

桌面端和 Web 端保持同一套结构：

```text
Activity Bar
  Connections
  Search
  History
  AI
  Dashboard
  Admin

Resource Tree
  Data source
  Database
  Schema
  Table
  View
  Function

Workspace
  Tabs
  SQL editor
  Table data
  ER diagram
  Query plan
  Dashboard

Context AI
  Current context
  Explain
  Optimize
  Fix error
  Risk review

Status Bar
  Connection
  Environment
  Readonly
  Runtime
  Rows
  AI provider
```

## 必须优先做好的交互

### Command Palette

`Cmd+K` / `Ctrl+K` 是核心入口。用户应该能通过命令面板完成：

- 连接数据库。
- 打开表、视图、历史 SQL。
- 新建 SQL Console。
- 执行、格式化、解释、优化 SQL。
- 导出结果。
- 切换主题。
- 打开 Admin Console。

### 全局搜索

一个搜索入口覆盖：

- 数据源、库、Schema、表、字段。
- 查询历史和保存查询。
- AI 会话。
- 审计记录。
- Dashboard 和文档。

### 多标签工作区

所有核心对象都应该可作为 Tab 打开：

- SQL Console。
- 表数据。
- 表结构。
- ER 图。
- 查询计划。
- Dashboard。
- 审计日志。

Tab 支持固定、恢复、关闭确认和会话恢复。

### 上下文 AI

AI 不作为孤立聊天框存在，而是绑定当前上下文：

- 当前连接。
- 当前数据库和 Schema。
- 选中的表和字段。
- 选中的 SQL。
- 执行错误。
- 查询结果摘要。
- 执行计划。
- 当前环境风险等级。

AI 输出的 SQL 默认只进入编辑器，不直接执行。

### 安全执行流

危险操作必须解释风险，而不是只弹一个确认框：

- 风险等级。
- 影响对象。
- 可能影响行数。
- 是否生产环境。
- 是否违反只读策略。
- AI 或系统建议改法。
- 是否需要管理员审批。

### 结果集体验

结果集是数据库工具的核心体验，必须优先打磨：

- 虚拟滚动。
- 列固定。
- 快速筛选和排序。
- 复制为 CSV、Markdown、Insert、Update。
- 快速生成图表。
- 显示耗时、行数、限制和截断状态。

## 不做的体验

- 不做传统后台系统风格的大量表单堆叠。
- 不把 AI 做成旁边一个无上下文聊天窗口。
- 不默认把危险 SQL 一键执行。
- 不让审计和权限治理打断普通查询流程。
- 不在 Web 和桌面端设计两套互相割裂的操作体验。
