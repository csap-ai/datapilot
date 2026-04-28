# Product Plan

## 产品定位

DataPilot 是完全开源的 AI 数据库工作台，面向开发者、数据分析师和需要企业审计治理的小团队。

目标不是做一个功能更多的 Navicat，而是做一个操作更顺、AI 更深入、安全更清晰、桌面端优先且 Web 同源的新一代数据库工具。

## 核心用户

- Developer：写 SQL、查数据、调试问题、理解数据库结构。
- Data Analyst：查询数据、保存查询、导出结果、生成图表和报表。
- DBA / Platform Admin：管理数据源权限、审计 SQL、控制风险策略。
- Team Lead：查看团队查询资产、审计记录和安全配置。

## 产品模块

### 1. Database Workspace

工作台是主入口，包含：

- 数据源连接列表。
- 数据库对象树。
- SQL Console。
- 表数据查看。
- 表结构查看。
- 多标签工作区。
- 查询历史和保存查询。
- 结果集查看和导出。

MVP 必须覆盖 MySQL、PostgreSQL 和 SQLite。后续扩展 Redis、MongoDB、ClickHouse、SQL Server、Oracle。

### 2. Command Center

全局操作中心，用于降低点击成本。

- Command Palette。
- 全局搜索。
- 最近打开。
- 快捷键提示。
- 快速执行常用动作。

这个模块是“比 Navicat 好用”的关键，不是锦上添花。

### 3. AI SQL Copilot

AI 必须贴合数据库上下文。

- 自然语言生成 SQL。
- 解释 SQL。
- 优化 SQL。
- 修复 SQL 错误。
- 根据表结构生成查询。
- 根据结果集生成总结。
- 根据执行计划给优化建议。
- 危险 SQL 风险解释。

AI Provider 支持 OpenAI-compatible API、DeepSeek、Claude、Qwen、Ollama。第一阶段先实现 OpenAI-compatible 和 Ollama。

### 4. Safety Engine

安全能力必须在 MVP 阶段进入底层设计。

- 只读连接。
- 环境标记：dev、staging、prod。
- 危险 SQL 识别。
- DDL/DML 二次确认。
- 无 `WHERE` 的 `UPDATE` / `DELETE` 阻断或强提醒。
- 生产环境高风险操作强提醒。
- AI 生成 SQL 不允许默认直接执行。

### 5. Result Experience

结果集体验必须接近现代开发工具，而不是传统后台表格。

- 虚拟滚动。
- 列固定。
- 筛选、排序、搜索。
- 复制为 CSV、Markdown、JSON、Insert、Update。
- 导出 CSV / JSON。
- 结果统计、耗时、行数、截断状态。
- 快速图表入口。

### 6. Admin Console

Admin Console 是企业审计和治理入口，作为 Web 应用内 `/admin` 路由实现。

- 用户、角色、权限。
- 数据源授权。
- 只读策略。
- SQL 风险策略。
- SQL 执行审计。
- 导出审计。
- AI 请求审计。
- 危险操作记录。
- 审计日志查询和导出。

桌面端可展示个人审计和本机配置，企业级治理默认放在 Web Admin Console。

### 7. Desktop Experience

桌面端从第一天设计并作为优先交付形态，使用 Wails。

- 快速启动。
- 原生窗口体验。
- 快捷键。
- 本地配置。
- 本地数据库连接。
- 文件拖拽。
- 多标签和工作区恢复。
- 命令面板和全局快捷键。
- 本地偏好设置和本机安全配置。
- 后续支持本地模型和离线模式。

桌面端和 Web 端复用同一套 React UI。产品体验先以桌面端为准，Web 端保持同源一致。

### 8. Mobile Experience

移动端后置，技术栈固定为 Flutter。

移动端优先做只读和辅助场景：

- 连接列表。
- 只读查询。
- 查询历史。
- 收藏查询。
- AI SQL 助手。
- 结果查看。

默认限制高风险写操作。

## 阶段规划

### Phase 0：Foundation

- Go API。
- React Web。
- Wails Desktop。
- UI 体系。
- Command Palette 基础。
- `/api/health`。

### Phase 1：Desktop Foundation

- Wails dev/build 链路。
- React UI 进入桌面端。
- 桌面窗口、状态栏和深色模式。
- 快捷键体系。
- 多标签工作区。
- 本地偏好设置。
- 工作区恢复。

### Phase 2：Database MVP

- 数据源管理。
- MySQL、PostgreSQL、SQLite。
- SQL Console。
- 查询执行。
- 结果集展示。
- 查询历史。
- 只读模式。
- 危险 SQL 基础识别。

### Phase 3：AI + UX

- OpenAI-compatible Provider。
- Ollama Provider。
- 上下文 AI。
- SQL 解释、优化、修复。
- 全局搜索。
- 多标签恢复。
- 快捷键体系。

### Phase 4：Admin + Audit

- Admin Console。
- RBAC。
- 数据源授权。
- 审计日志。
- AI 审计。
- 风险策略配置。
- 审计导出。

### Phase 5：Navicat-Class Features

- ER 图。
- 查询计划可视化。
- 结构对比。
- 数据对比。
- 数据字典。
- Dashboard。
- 导入导出增强。

### Phase 6：Flutter Mobile

- 创建 Flutter 应用。
- 只读查询。
- 历史和收藏。
- AI SQL 助手。
- 移动端安全限制。

## 成功标准

- 常用查询路径比 Navicat 少点击。
- 危险 SQL 执行前能明确说明风险。
- AI 能理解当前库结构和选中 SQL。
- 桌面端常用操作路径足够顺滑，Web 端与桌面端同源一致。
- 数据结果表格足够顺滑。
- 审计能力不打扰普通用户操作。
