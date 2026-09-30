# Mock Server — 产品需求文档（PRD）

| 项目 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 文档状态 | 待评审 |
| 创建日期 | 2026-09-30 |
| 技术栈 | Next.js 14 + React 18 + TypeScript + TailwindCSS + shadcn/ui |
| 数据存储 | MySQL 8.0 |
| Mock 引擎 | Mock.js |
| 文档作者 | Lewis |

---

## 1. 概述

### 1.1 一句话定位
为前后端联调阶段提供 **基于 Thrift 契约 + Mock.js 占位符** 的可视化 Mock 接口管理平台，让前端能拿到结构稳定、可重复、贴近真实场景的测试数据。

### 1.2 解决的核心问题
- 后端接口未就绪时，前端没有可依赖的稳定 mock 数据来源
- 接口字段约束散落在文档/口头约定里，前后端理解不一致
- 想要不同场景（正常/边界/异常）数据时需要手写多个 JSON
- mock 数据缺乏随机性，每次请求都返回一模一样的内容，无法压测前端渲染

### 1.3 范围界定
**包含**
- 后台管理界面（CRUD、搜索、预览、转换、全局配置）
- Mock 数据 HTTP 接口（GET/POST 同一地址）
- Thrift 解析与 JSON 模板生成
- JSON → Thrift 反向转换
- 日志记录

**不包含（v1.0）**
- 用户/权限/审计系统
- WebSocket / SSE mock
- OpenAPI / Swagger 导入导出
- 接口版本管理与回滚
- 多租户隔离
- 集群部署

---

## 2. 用户与场景

### 2.1 目标用户
| 角色 | 占比 | 关注点 |
| --- | --- | --- |
| 前端开发工程师 | 60% | 接口是否能返回我需要的结构、能不能快速切换场景 |
| 后端开发工程师 | 20% | 接口契约是否能用 Thrift 定义、是否方便交接给前端 |
| 测试工程师 | 15% | 能否造不同数据组合、能否控制错误率 |
| 平台管理员 | 5% | 全局参数调整、清理过期接口 |

### 2.2 核心使用流程

```
┌──────────┐    1. 创建 Mock 接口     ┌──────────────┐
│  用户A   │ ──────────────────────► │              │
│ (后端)   │  · 编辑 Thrift 结构     │  Mock Server │
│          │  · 生成 JSON 模板        │   后台管理    │
│          │  · 调整占位符与字段       │              │
└──────────┘    · 保存                └──────┬───────┘
                                            │ 2. 启用
                                            ▼
                                     ┌──────────────┐
                                     │  Mock HTTP   │
                                     │   Endpoint   │
                                     │ /mock/{id}   │
                                     └──────┬───────┘
                                            │ 3. 发起请求
                                            ▼
┌──────────┐    4. 拿到响应数据        ┌──────────────┐
│  用户B   │ ◄────────────────────── │              │
│ (前端)   │  · 符合 Thrift 结构     │              │
│          │  · 字段随机填充          │              │
└──────────┘                          └──────────────┘
```

---

## 3. 功能需求

### 3.1 Mock 接口管理（FR-1）

#### 3.1.1 创建 Mock 接口
**必填**
| 字段 | 类型 | 校验规则 |
| --- | --- | --- |
| 接口名称 | string | 1-64 字符，不可重复 |
| 唯一标识 | string（URL 路径段） | 3-64 字符，`[a-z0-9_-]+`，全局唯一 |
| 响应模板 | string（JSON） | 合法 JSON，可含 Mock.js 占位符 |

> 所有 Mock 接口**统一支持 GET 与 POST**，无需在接口级别配置请求方法。

**可选**
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| 描述 | string | 255 字符内 |
| 启用状态 | boolean | 默认启用 |
| Thrift 定义 | text | 可编辑的结构契约，点击「生成 JSON 模板」同步下方响应模板 |
| 数组长度覆盖 | int | 覆盖全局默认，仅对此接口生效 |
| 自定义状态码 | int | 默认 200 |
| 模拟延迟 | int (ms) | 0-10000，默认 0 |
| 错误率 | decimal (0-100) | 随机返回 500 的概率，默认 0 |

#### 3.1.2 编辑 / 删除 / 启停
- 编辑：所有字段可改，唯一标识变更需提示「URL 路径将变更」
- 删除：二次确认（输入接口名称确认）
- 启停：禁用后请求返回 404

#### 3.1.3 唯一标识冲突检测
- 创建/编辑时实时校验
- 命中已有标识时禁用提交并显示提示

### 3.2 数据结构定义（FR-2）

数据结构的搭建采用「**Thrift 编辑 → 生成 JSON 模板 → 二次调整**」两段式工作流：Thrift 是结构契约，JSON 模板是运行时响应样本；前者定义字段类型与嵌套关系，后者由系统根据 Thrift 自动生成骨架并允许用户自由调整。

```
┌─ Thrift 结构定义（可编辑） ─┐    ① 用户编写/调整 .thrift 内容
│                            │    ② 实时解析：字段数、嵌套结构数
└──────────────┬─────────────┘
               │ 点击「生成 JSON 模板」
               ▼
┌─ JSON 响应模板（可编辑） ──┐    ③ 系统按字段名智能选择占位符
│                            │    ④ 用户继续调整：改占位符、加字段、加 wrapper
└────────────────────────────┘    ⑤ 失焦校验：占位符合法性
```

#### 3.2.1 Thrift 文件编辑
- **入口**：管理后台编辑页提供 Thrift 内容编辑器（`<textarea>` 形式，带行号与列号状态条）
- **导入**：支持上传 `.thrift` 文件（最大 1MB），内容自动填入编辑器
- **解析**：每次失焦或点击「生成 JSON 模板」时全量解析
- **解析结果展示**：字段总数、嵌套 struct 数、解析状态（✓ / ✗ 含错误位置）

**解析失败**
- 高亮错误位置（行号、字段名）
- 提示常见原因（缺少分号、命名空间缺失、未声明的类型引用等）

#### 3.2.2 生成 JSON 响应模板
- 用户编辑 Thrift 后点击「**生成 JSON 模板**」按钮触发
- 系统按以下规则生成 JSON 骨架：

| Thrift 字段 | JSON 输出 | 默认占位符（按字段名智能选择） |
| --- | --- | --- |
| `string` | `"@..."` | `email` → `@email`、`nickname`/`name` → `@cname`、`url`/`avatar` → `@image(...)`、其他 → `@string` |
| `i32` / `i64` | `"@..."` | `age`/`count` → `@integer(0,100)`、其他 → `@integer(1,10000)` |
| `double` | `"@..."` | `@float(0,1000,2,3)` |
| `bool` | `"@..."` | `@boolean` |
| `list<T>` | `[{...}, {...}]` | 数组内嵌套对象生成 1 条示例 |
| `optional<T>` | `"@..."` | 同 T，`required` 与否不改变占位符语义 |

- **嵌套结构处理**：每个嵌套 struct 在 JSON 中生成对应对象，数组元素中放 1 条示例
- **重新生成**：JSON 模板二次调整后，点击「从 Thrift 重新生成」会**覆盖**现有内容（按钮带二次确认）

#### 3.2.3 JSON 模板二次编辑
- JSON 模板编辑器同样为 `<textarea>`，可任意修改
- 用户常见的后续调整：
  - 添加 wrapper 字段（如 `{code, message, data}`）
  - 修改占位符（如 `@cname` → `@ctitle`）
  - 增删字段（不受 Thrift 约束）
  - 调整数组项数（在右侧「高级配置」设置覆盖）
- 右侧 Mock.js 占位符速查面板可点击插入到光标位置

支持的 Mock.js 占位符全集：

| 分类 | 占位符 | 示例输出 |
| --- | --- | --- |
| 基础类型 | `@boolean` | `true` / `false` |
| 基础类型 | `@integer(1,100)` | `42` |
| 基础类型 | `@float(0,100,2,3)` | `42.13` |
| 基础类型 | `@string(5,10)` | `"aB3xK"` |
| 基础类型 | `@date('yyyy-MM-dd')` | `"2026-09-30"` |
| 中文文本 | `@ctitle(3,5)` | `"周三下午"` |
| 中文文本 | `@cname` | `"张伟"` |
| 中文文本 | `@csentence(5,15)` | `"这是一个测试句子。"` |
| 地址 | `@province` | `"广东省"` |
| 地址 | `@city` | `"深圳市"` |
| 地址 | `@zip` | `"518000"` |
| 网络 | `@email` | `"x@y.com"` |
| 网络 | `@url` | `"http://a.com/b"` |
| 网络 | `@ip` | `"192.168.1.1"` |
| ID | `@id` | `"450000199001011234"` |
| ID | `@uuid` | `"a1b2c3d4-..."` |
| 图片 | `@image('200x100', '#4A90E2', '#fff', 'png', 'mock')` | `"http://.../mock.png"` |

#### 3.2.4 实时校验
- **Thrift 校验**：每次失焦校验语法，解析失败时显示错误位置
- **占位符校验**：JSON 模板失焦时扫描所有 `@xxx` 占位符
  - 合法：顶部统计数字 + 正常着色
  - 未知：红色下划线 + hover 提示「未知占位符，建议使用 @xxx」
  - 顶部状态条实时显示「合法 X · 未知 Y」

### 3.3 JSON → Thrift 转换（FR-3）

- 用户粘贴 JSON 或上传 .json 文件
- 类型推断规则

| JSON 类型 | Thrift 类型 |
| --- | --- |
| string | `string` |
| integer | `i32` |
| number（整数） | `i64`（值 > 2³¹−1 时） |
| number（小数） | `double` |
| boolean | `bool` |
| array | `list<T>` |
| object | `struct T { ... }` |
| null | `optional<string>`（默认推断为 string） |

- 生成 Thrift 文本，提供下载（`mock-{时间戳}.thrift`）
- 一键「导入到新建 Mock 接口」

### 3.4 实时 mock 响应（FR-4）

#### 3.4.1 接口约定
```
ANY  http://<host>:<port>/mock/{identifier}
```

- 路径段唯一标识命中 Mock 接口表
- **GET 与 POST 均由所有接口统一支持**，无需按接口配置
- 不支持的请求方法 → 返回 405
- 接口被禁用 → 返回 404
- 唯一标识不存在 → 返回 404

#### 3.4.2 响应生成流水线
```
1. 查表 → 接口记录
2. 错误率随机 → 命中则返回 500 + 错误体
3. 模拟延迟 sleep N 毫秒
4. 加载 JSON 模板
5. 应用数组长度（覆盖值 > 全局值 > 默认 3）
6. Mock.js 渲染占位符
7. 返回 JSON + 自定义状态码
```

#### 3.4.3 响应体
- Content-Type: `application/json; charset=utf-8`
- 启用错误模拟时返回：
  ```json
  { "code": 500, "message": "Mock error", "requestId": "uuid" }
  ```

#### 3.4.4 日志
每次请求写入 `mock_request_log`：
- interface_id、identifier、method、status_code、duration_ms、client_ip、created_at

### 3.5 全局配置（FR-5）

| 配置项 | 默认 | 校验范围 | 说明 |
| --- | --- | --- | --- |
| 数组默认长度 | 3 | 1-100 | 所有接口默认使用此长度生成数组 |
| Mock.js 区域 | `zh-cn` | zh-cn / en | 影响 `@cname` 等占位符输出 |
| 启用错误模拟 | false | bool | 全局开关，关闭时各接口错误率失效 |
| 请求日志保留天数 | 7 | 1-90 | 定时清理过期日志 |

### 3.6 接口搜索（FR-6）

- 列表页顶部搜索框（粘性）
- 搜索范围：名称、唯一标识、描述
- 实时搜索（300ms 防抖）
- 命中关键字高亮显示
- 空结果友好提示 + 建议「新建 Mock 接口」

---

## 4. 非功能需求

### 4.1 性能
| 指标 | 目标 |
| --- | --- |
| Mock 接口响应（无配置延迟） | P95 < 50ms |
| 列表搜索 | P95 < 300ms |
| 并发支持 | ≥ 100 QPS 单实例 |
| 页面首次加载 | LCP < 2.5s |

### 4.2 兼容性
- Node.js ≥ 18.17
- MySQL ≥ 8.0
- 现代浏览器（Chrome / Edge / Safari / Firefox 最近 2 个版本）

### 4.3 部署
- 单实例 Docker Compose
- 环境变量配置数据库连接
- 默认端口：3000
- 健康检查：`GET /api/health`

### 4.4 可观测性
- 控制台请求日志（开发）
- 生产 stdout JSON 日志
- 关键操作（创建/删除/修改配置）写入操作日志

### 4.5 安全
- 输入校验：所有 string 字段防 XSS（前端 React 自动转义）
- SQL 注入防护：Prisma 参数化查询
- 文件上传：仅允许 `.thrift` / `.json` 后缀，限制大小
- 频率限制：mock 接口每 IP 600 req/min（防滥用）

---

## 5. 技术架构

### 5.1 技术栈

| 层 | 技术 |
| --- | --- |
| 前端框架 | Next.js 14 (App Router) + React 18 |
| 语言 | TypeScript |
| 样式 | TailwindCSS + shadcn/ui |
| 数据请求 | TanStack Query (React Query) |
| 表单 | React Hook Form + Zod |
| ORM | Prisma |
| 数据库 | MySQL 8.0 |
| Mock 引擎 | Mock.js（运行在 Route Handler） |
| Thrift 解析 | 自实现 + `thrift` 库辅助 |
| 部署 | Docker + Docker Compose |

### 5.2 数据模型

```sql
-- Mock 接口定义表
CREATE TABLE mock_interface (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  name            VARCHAR(128) NOT NULL COMMENT '接口名称',
  identifier      VARCHAR(64)  NOT NULL UNIQUE COMMENT 'URL 唯一标识',
  description     VARCHAR(512) COMMENT '描述',
  status          TINYINT      NOT NULL DEFAULT 1 COMMENT '1=启用 0=禁用',
  thrift_def      MEDIUMTEXT   COMMENT 'Thrift 源文件',
  json_template   MEDIUMTEXT   NOT NULL COMMENT 'JSON 响应模板',
  array_length    INT          COMMENT '数组长度覆盖',
  status_code     INT          NOT NULL DEFAULT 200 COMMENT '响应状态码',
  delay_ms        INT          NOT NULL DEFAULT 0 COMMENT '模拟延迟',
  error_rate      DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '错误率 0-100',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_updated (updated_at)
);

-- 全局配置表（key-value）
CREATE TABLE global_config (
  config_key     VARCHAR(64) PRIMARY KEY,
  config_value   TEXT NOT NULL,
  description    VARCHAR(256),
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 请求日志表
CREATE TABLE mock_request_log (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  interface_id    BIGINT  NULL,
  identifier      VARCHAR(64) NOT NULL,
  method          VARCHAR(10) NOT NULL,
  status_code     INT NOT NULL,
  duration_ms     INT NOT NULL,
  client_ip       VARCHAR(45),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_interface (interface_id),
  INDEX idx_created (created_at)
);

-- 操作日志表（v1 可选）
CREATE TABLE operation_log (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  action        VARCHAR(32) NOT NULL,
  resource_type VARCHAR(32) NOT NULL,
  resource_id   BIGINT,
  detail        JSON,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 API 设计

#### 5.3.1 后台管理 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/interfaces?keyword=&page=&pageSize=&status=` | 列表 + 搜索 |
| POST | `/api/interfaces` | 创建 |
| GET | `/api/interfaces/:id` | 详情 |
| PUT | `/api/interfaces/:id` | 更新 |
| DELETE | `/api/interfaces/:id` | 删除 |
| POST | `/api/interfaces/:id/toggle` | 启停切换 |
| POST | `/api/interfaces/:id/preview` | 渲染 mock 数据 |
| POST | `/api/interfaces/preview` | 用临时模板预览 |
| POST | `/api/json-to-thrift` | JSON 转 Thrift |
| POST | `/api/thrift-validate` | Thrift 语法校验 |
| GET | `/api/config` | 获取全局配置 |
| PUT | `/api/config` | 更新全局配置 |
| GET | `/api/logs?interfaceId=&page=` | 请求日志 |
| GET | `/api/health` | 健康检查 |

#### 5.3.2 Mock 数据 API

```
ANY  /mock/:identifier
```

### 5.4 目录结构

```
mock-server/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx             # 后台壳（sidebar）
│   │   ├── page.tsx               # 列表
│   │   ├── interfaces/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── converter/page.tsx
│   │   ├── settings/page.tsx
│   │   └── logs/page.tsx
│   ├── api/
│   │   ├── interfaces/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── toggle/route.ts
│   │   │       └── preview/route.ts
│   │   ├── config/route.ts
│   │   ├── json-to-thrift/route.ts
│   │   ├── thrift-validate/route.ts
│   │   ├── logs/route.ts
│   │   ├── health/route.ts
│   │   └── mock/
│   │       └── [identifier]/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn/ui
│   ├── editor/
│   │   ├── ThriftEditor.tsx
│   │   ├── JsonTemplateEditor.tsx
│   │   └── PlaceholderHelper.tsx
│   ├── preview/
│   │   └── ResponsePreview.tsx
│   └── layout/
│       └── Sidebar.tsx
├── lib/
│   ├── db.ts                      # Prisma 客户端
│   ├── mock-engine.ts             # Mock.js 渲染
│   ├── thrift-parser.ts           # Thrift 解析（语法 + 结构树）
│   ├── thrift-to-json.ts          # Thrift 结构树 → JSON 模板生成器
│   ├── json-to-thrift.ts          # JSON → Thrift
│   ├── placeholder.ts             # 占位符校验
│   └── logger.ts
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

### 5.5 关键模块

#### 5.5.1 Mock 引擎 (`lib/mock-engine.ts`)
```typescript
function renderMock(template: string, options: {
  arrayLength: number;
  locale: 'zh-cn' | 'en';
}): unknown {
  const Mock = require('mockjs');
  return Mock.mock(JSON.parse(template));
}
```

#### 5.5.2 Thrift 解析 (`lib/thrift-parser.ts`)
- 使用 `thrift-parser` 包做词法/语法分析
- 输出结构树（struct 嵌套、字段类型、required/optional）
- 同时供 §3.2.1 的实时校验与 §3.2.2 的 JSON 模板生成复用
- 支持 struct / list / map / basic types

#### 5.5.3 Thrift → JSON 模板生成器 (`lib/thrift-to-json.ts`)
```typescript
function generateJsonTemplate(thriftAst: ThriftFile): string {
  // 1. 找到第一个 struct（或暴露根 struct 选择器）
  // 2. 遍历字段：
  //    - 按字段名映射到默认占位符（email → @email、name → @cname...）
  //    - 嵌套 struct 递归展开
  //    - list<T> 生成 1 条示例
  // 3. 输出格式化 JSON 字符串
}
```
- 字段名→占位符的映射规则见 §3.2.2 表格
- 用户后续二次编辑 JSON 模板不受该生成器约束

#### 5.5.4 频率限制
- 使用 `next-rate-limit` 或自实现内存计数器
- 单 IP 每分钟 600 次，超过返回 429

---

## 6. UI 原型

UI 原型以 HTML 静态页面呈现，参见 `prototype/` 目录：

| 文件 | 页面 | 主要展示 |
| --- | --- | --- |
| `list.html` | Mock 接口列表 | 搜索、筛选、表格、分页 |
| `edit.html` | 创建/编辑 Mock 接口 | Thrift 可编辑 + 一键生成 JSON 模板 + 二次调整 + 占位符速查 + 实时预览 |
| `preview.html` | Mock 响应预览 | 格式化 JSON、复制、状态码与延迟 |
| `converter.html` | JSON → Thrift 转换 | 输入区、推断结果、下载 |
| `settings.html` | 全局配置 | 数组长度、Mock.js 区域、日志保留 |

样式风格：参考 shadcn/ui 默认主题（中性色、圆角、细边框），左侧固定侧边栏 + 顶部粘性操作栏 + 主内容区卡片式布局。

---

## 7. 里程碑

| 阶段 | 时间（相对） | 交付物 |
| --- | --- | --- |
| M1 — 脚手架 | 第 1 周 | Next.js 项目初始化、Prisma + MySQL 连接、Docker Compose |
| M2 — 后端核心 | 第 2 周 | Mock 引擎、Thrift 解析、JSON 转换、Mock HTTP 接口 |
| M3 — 后台 UI | 第 3 周 | 列表、编辑、预览、转换器、设置页面 |
| M4 — 打磨 | 第 4 周 | 搜索、错误处理、Docker 镜像、README |

---

## 8. 待定事项（待评审）

1. **响应是否随请求参数变化**：当前版本每次响应结构一致但占位符值随机。是否需要支持根据请求 body/query 参数动态返回不同响应？
2. **多场景响应**：是否需要为单个接口定义 success/error/empty 等多套模板，通过 query 参数切换？
3. **导入/导出**：是否需要批量导入/导出 mock 接口配置（JSON/YAML）？
4. **OpenAPI 集成**：是否支持从 Swagger/OpenAPI 文件导入？
5. **分组/目录**：mock 接口数量多时是否需要文件夹/分组管理？
6. **协作**：是否需要接口变更通知（邮件/Webhook）？

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| Thrift 解析复杂度高 | 嵌套泛型、union 类型解析易出错 | v1 仅支持 struct/list/map/basic，复杂类型降级为 JSON |
| Mock.js 性能瓶颈 | 高并发下模板渲染慢 | 缓存渲染结果（按 identifier 缓存 5s）+ 监控 |
| 唯一标识冲突 | 用户习惯用业务编码作为标识 | 创建时实时校验 + 友好的命名建议 |
| 占位符滥用 | 错误占位符导致响应异常 | 编辑器实时校验 + 渲染 try/catch + 错误占位符 fallback |

---

## 10. 变更记录

| 版本 | 日期 | 变更内容 |
| --- | --- | --- |
| v1.0 | 2026-09-30 | 初稿 |