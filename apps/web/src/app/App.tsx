import { useState } from 'react';

import { fetchHealthStatus, type IHealthStatus } from '../shared/api/health';

const pillars = [
  '开源自部署',
  'AI-first SQL 工作流',
  '数据库插件化',
  '执行前安全审查',
];

export function App() {
  const [health, setHealth] = useState<IHealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkServer() {
    setError(null);

    try {
      setHealth(await fetchHealthStatus());
    } catch (caught) {
      setHealth(null);
      setError(caught instanceof Error ? caught.message : '服务检查失败');
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">DataPilot</p>
        <h1>完全开源的 AI 数据库工作台</h1>
        <p className="summary">
          目标不是复刻 Navicat 的每一个功能，而是从连接、查询、理解、审查、协作开始，
          构建一个可自部署、可扩展、AI 原生的数据开发环境。
        </p>
        <div className="actions">
          <button type="button" onClick={checkServer}>
            检查后端服务
          </button>
          <a href="https://github.com/" target="_blank" rel="noreferrer">
            准备开源仓库
          </a>
        </div>
      </section>

      <section className="status-card">
        <h2>服务状态</h2>
        {health ? (
          <pre>{JSON.stringify(health, null, 2)}</pre>
        ) : (
          <p>{error ?? '后端启动后点击按钮查看 /api/health 状态。'}</p>
        )}
      </section>

      <section className="grid">
        {pillars.map((pillar) => (
          <article key={pillar}>
            <h3>{pillar}</h3>
            <p>这是第一阶段产品基线，后续围绕连接管理、SQL 编辑器、AI Provider 和安全执行持续展开。</p>
          </article>
        ))}
      </section>
    </main>
  );
}
