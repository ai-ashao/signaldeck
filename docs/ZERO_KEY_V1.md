# Zero-Key V1 Policy

V1 不要求用户申请任何第三方**数据源** API Key。

优先级：

1. 匿名 REST / JSON
2. RSS / Atom
3. 官方公开页面
4. 免费聚合站
5. Manual URL

明确不做：

- GitHub Search API
- X API
- Product Hunt GraphQL API
- 自建通用爬虫

AI 评分默认使用本地 deterministic scorer；可选 Ollama。
