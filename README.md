# SignalDeck

**AI Content Opportunity Radar — Zero-Key V1**

SignalDeck 把公开 AI 信息源收进一个候选池，做事件级去重、内容价值评分，然后每天输出适合短视频、长视频和公众号的候选选题。

## 核心原则

V1 **不要求注册任何第三方数据 API**：

- AIHOT：匿名 REST API
- Hacker News：公开官方 API
- Product Hunt：RSS
- 官方 Blog / Newsletter：RSS / Atom
- Manual URL：你自己看到的 X、GitHub、网页直接粘贴

GitHub Search、X API、自建爬虫都不在 V1。

默认评分也不需要模型 API：使用启发式评分。若本机安装 Ollama，可设置 `OLLAMA_MODEL` 后自动升级为本地 LLM 评分，依然不需要注册 API Key。

## 功能

- [x] AIHOT Adapter
- [x] Hacker News Adapter
- [x] Product Hunt RSS
- [x] 通用 RSS / Atom
- [x] Manual URL
- [x] SQLite 本地持久化
- [x] URL + 标题事件去重
- [x] Rule Filter / Rule Score
- [x] Zero-key 内容评分
- [x] 可选 Ollama 本地 AI 评分
- [x] Top / Short Video / Long Video / WeChat 排序
- [x] Save / Ignore
- [x] 事件详情与多来源证据
- [x] Short / Long / WeChat Content Brief
- [x] Sources 开关与自定义 RSS
- [x] 手动 Refresh
- [x] Cron endpoint（适合 VPS）

## 本地运行

要求 Node.js 22+。

```bash
cp .env.example .env.local
npm install
npm run dev
```

浏览器打开：

```text
http://localhost:3000
```

第一次进入后点击 **Refresh sources**。

也可以命令行刷新：

```bash
npm run refresh
```

提交前可运行完整验证：

```bash
npm run verify
```

它会依次执行 ESLint、Vitest、严格 TypeScript 检查和 production build。

## 完全零 Key 的推荐配置

`.env.local`：

```env
DATABASE_PATH=./data/signaldeck.db
```

就够了。

## 可选：Ollama 本地 AI 评分

安装 Ollama 并准备一个模型，例如：

```bash
ollama pull qwen3:8b
```

`.env.local`：

```env
OLLAMA_MODEL=qwen3:8b
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

如果 Ollama 不可用，系统自动退回 zero-key heuristic scorer，不影响使用。

## Docker

```bash
docker compose up --build
```

数据库保存在：

```text
data/signaldeck.db
```

因此重启容器不会丢数据。

Docker Compose 默认只监听 `127.0.0.1:3000`。SignalDeck V1 没有用户登录层；如需从公网访问，请先通过带认证的反向代理或 VPN 暴露服务，不要直接开放 3000 端口。

## 数据流

```text
AIHOT / HN / Product Hunt / RSS / Manual URL
                    ↓
                 Raw Items
                    ↓
               Event Dedup
                    ↓
                Rule Score
                    ↓
        Heuristic / Optional Ollama
                    ↓
        Short / Long / WeChat Ranking
                    ↓
               人工选 1–3 条
```

## 关于部署

V1 为**个人、本地优先**设计，使用 SQLite，目的是满足“零注册、零第三方数据 Key”。

适合：

- Mac 本地常驻
- 家庭服务器 / NAS
- 有持久磁盘的 VPS
- Docker + volume

**不建议直接部署到 Vercel**，因为 Vercel 的本地文件系统不适合作为持久 SQLite 数据库。

后续如果确定长期使用，再把 DB Adapter 换成 Postgres / Supabase / Cloudflare D1；不影响 Source / Dedup / Scoring 结构。

## 自动刷新

VPS 上可请求：

```text
GET /api/cron/fetch
```

如果设置：

```env
CRON_SECRET=your-secret
```

请求需带：

```text
Authorization: Bearer your-secret
```

Linux cron 示例：

```cron
0 * * * * curl -fsS -H "Authorization: Bearer YOUR_SECRET" http://127.0.0.1:3000/api/cron/fetch >/dev/null
```

## 推荐的日常使用方式

1. 每小时或每天刷新。
2. 打开 `Top`，只看前 10 条。
3. 需要做营销短视频：看 `Short Video`。
4. 值得慢慢讲：放进 `Long Video`。
5. 适合文章：放进 `WeChat`。
6. 点击事件先看多个来源，发布前回原始链接核验事实。
7. 自己刷到 X / GitHub 好内容，用 `+ Add URL` 直接丢进 Radar。

## 注意

SignalDeck 是选题发现与内部研究工具。聚合源的摘要不能视为第三方内容商业再分发授权。确定选题后，应回到官方或原始来源核验并自行重写、录制和评论。
