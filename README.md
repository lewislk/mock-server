# Mock Server

基于 Thrift 契约 + Mock.js 占位符的内部 Mock 接口管理平台。

## 快速启动

```bash
# 1. 安装依赖
pnpm install

# 2. 启动 MySQL
docker compose up -d mysql

# 3. 数据库迁移
pnpm db:migrate

# 4. 填充示例数据
pnpm db:seed

# 5. 启动开发服务器
pnpm dev
```

访问：

- 后台管理：http://localhost:3000
- 数据库管理（Adminer）：http://localhost:8080
- Mock 接口示例：http://localhost:3000/mock/user-detail

## 命令速查

| 用途 | 命令 |
| --- | --- |
| 启动 MySQL | `docker compose up -d mysql` |
| 数据库迁移 | `pnpm db:migrate` |
| Seed 数据 | `pnpm db:seed` |
| 启动开发服务器 | `pnpm dev` |
| 类型检查 | `pnpm typecheck` |
| Lint | `pnpm lint` |
| 格式化 | `pnpm format` |
| 测试 | `pnpm test` |

## 目录结构

参见 [AGENTS.md §4.2](./AGENTS.md)。

## 设计文档

- [PRD.md](./PRD.md) — 产品需求文档
- [AGENTS.md](./AGENTS.md) — 协作指引与工作项拆解
- [prototype/](./prototype/) — UI 原型（HTML 静态页）