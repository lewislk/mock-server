# AGENTS.md — Mock Server 协作指引

> 本文件是 Mock Server 项目协作的**单一事实来源**，所有 Agent（主 Agent 与子 Agent）在开始任何工作前**必须**完整阅读本文件。
>
> 项目功能详情见 [PRD.md](./PRD.md)，UI 原型见 [`prototype/`](./prototype/) 目录。

---

## 1. 项目背景

构建一个内部 Mock 服务平台：前端在后台接口未就绪时，通过约定好的 `/mock/{identifier}` 地址拿到**结构稳定、可重复、贴近真实场景**的测试数据。技术核心是基于 Thrift 契约 + Mock.js 占位符的两段式模板生成流程。

---

## 2. 技术栈约束（不可偏离）

子 Agent **不得**引入未列出的依赖。如需新增，必须先报告主 Agent。

### 2.1 运行时与框架

| 类别 | 技术 | 版本约束 |
| --- | --- | --- |
| Node.js | Node | `>= 18.17` |
| 框架 | Next.js | `14.x`（**必须使用 App Router**，禁止 Pages Router） |
| UI 库 | React | `18.x` |
| 语言 | TypeScript | `5.x`，`strict: true` |

### 2.2 样式与组件

| 类别 | 技术 | 约束 |
| --- | --- | --- |
| CSS 框架 | TailwindCSS | `3.x`，使用 `tailwind.config.ts` |
| 组件库 | shadcn/ui | **手动集成**（`npx shadcn@latest add`），所有 UI 原子组件放在 `components/ui/` |
| 图标 | lucide-react | 与 shadcn 配套，禁止引入其他图标库 |
| 类合并 | `cn()` 工具 | 必须使用 `lib/utils.ts` 中的 `cn()` 函数，禁止字符串拼接 className |

### 2.3 数据与状态

| 类别 | 技术 | 用途 |
| --- | --- | --- |
| ORM | Prisma | `5.x`，连接 MySQL |
| 数据库 | MySQL | `8.0+` |
| 表单 | React Hook Form + Zod | 所有受控表单 |
| 服务端状态 | TanStack Query (React Query) | `5.x`，仅用于客户端组件 |
| 客户端状态 | React useState / useReducer | 优先本地状态 |

### 2.4 业务核心

| 类别 | 技术 | 约束 |
| --- | --- | --- |
| Mock 引擎 | Mock.js | `1.1.0`，zh-cn 默认 locale |
| Thrift 解析 | `thrift-parser` | 用于词法/语法分析，自实现结构树包装 |
| 类型校验 | Zod | `3.x`，所有 API 入参必须 Zod 校验 |

### 2.5 工具链

| 类别 | 技术 |
| --- | --- |
| Lint | ESLint + `eslint-config-next` |
| Format | Prettier + `prettier-plugin-tailwindcss` |
| 包管理 | pnpm |
| 部署 | Docker + Docker Compose |

---

## 3. 编码规范

### 3.1 TypeScript

- `strict: true`，禁止使用 `any`（必要时用 `unknown` + 类型守卫）
- 对象结构用 `interface`，联合/工具类型用 `type`
- 枚举使用 `as const` 对象 + 联合类型，**不使用** `enum` 关键字
- 导出类型时使用 `export type` 而非 `export interface`（除非需要扩展）
- 命名：类型/接口 `PascalCase`，变量/函数 `camelCase`，常量 `UPPER_SNAKE_CASE`

### 3.2 React 组件

- **服务端组件优先**：默认不写 `"use client"`，只在需要 hooks/事件/浏览器 API 时添加
- 客户端组件必须显式标注 `"use client"`
- Props 类型命名为 `XxxProps`，与组件同名同文件
- 避免不必要的前缀（如 `Mock` InterfaceForm 而非 `MockInterfaceFormComponent`）
- 组件导出：默认导出仅用于 `Page` 路由文件；其他组件一律**具名导出**
- 受控表单统一用 React Hook Form + Zod resolver，禁止裸 useState 表单

### 3.3 Hooks

- 自定义 Hook 文件名 `use-xxx.ts`（kebab-case）或 `useXxx.ts`（camelCase），**项目内统一一种**
- Hook 内部禁止条件调用 hooks
- 数据获取使用 `useQuery` / `useMutation`（TanStack Query），不在 hook 中直接 fetch

### 3.4 错误处理

- API Route Handler 必须 `try/catch`，统一错误响应结构：`{ code: number, message: string, requestId?: string }`
- 客户端组件用 `error.tsx` 边界处理渲染错误
- 关键业务异常抛出**自定义错误类**，禁止裸 `throw new Error(...)`

### 3.5 注释与日志

- 函数级注释仅在复杂业务处添加，禁止显而易见的注释
- 关键业务决策必须在代码上方留 1-2 行说明「为什么」
- 控制台日志统一通过 `lib/logger.ts`，禁止散落 `console.log`

---

## 4. 文件与目录约定

### 4.1 文件命名

| 类型 | 命名规则 | 示例 |
| --- | --- | --- |
| React 组件 | `PascalCase.tsx` | `MockInterfaceTable.tsx` |
| Hooks | `use-xxx.ts` | `use-mock-data.ts` |
| 工具函数/库 | `kebab-case.ts` | `thrift-parser.ts`、`mock-engine.ts` |
| 类型定义 | `kebab-case.ts`（与实现同文件时不分拆） | `placeholder.ts` |
| API Route | `route.ts`（Next.js 约定，不可改名） | `app/api/interfaces/route.ts` |
| 页面 | `page.tsx`（Next.js 约定） | `app/(admin)/page.tsx` |
| 布局 | `layout.tsx`（Next.js 约定） | `app/(admin)/layout.tsx` |
| 错误页 | `error.tsx`（Next.js 约定） | `app/(admin)/error.tsx` |
| 配置文件 | `kebab-case.config.ts` | `tailwind.config.ts` |

### 4.2 目录结构（必须遵守）

```
mock-server/
├── app/
│   ├── (admin)/                 # 后台管理路由组（共享 layout）
│   │   ├── layout.tsx
│   │   ├── page.tsx             # 列表
│   │   ├── interfaces/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── converter/page.tsx
│   │   ├── preview/page.tsx
│   │   └── settings/page.tsx
│   ├── api/                     # 后端路由
│   │   ├── interfaces/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts
│   │   │   │   ├── toggle/route.ts
│   │   │   │   └── preview/route.ts
│   │   │   └── preview/route.ts
│   │   ├── config/route.ts
│   │   ├── json-to-thrift/route.ts
│   │   ├── thrift-validate/route.ts
│   │   ├── logs/route.ts
│   │   ├── health/route.ts
│   │   └── mock/
│   │       └── [identifier]/route.ts
│   ├── layout.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   ├── ui/                      # shadcn 自动生成，禁止手改结构
│   ├── layout/
│   │   └── Sidebar.tsx
│   ├── editor/
│   │   ├── ThriftEditor.tsx
│   │   ├── JsonTemplateEditor.tsx
│   │   └── PlaceholderHelper.tsx
│   └── preview/
│       └── ResponsePreview.tsx
├── lib/
│   ├── db.ts                    # Prisma 客户端单例
│   ├── utils.ts                 # shadcn 生成的 cn() 等
│   ├── mock-engine.ts
│   ├── thrift-parser.ts
│   ├── thrift-to-json.ts
│   ├── json-to-thrift.ts
│   ├── placeholder.ts
│   └── logger.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── AGENTS.md                    # 本文件
└── PRD.md
```

### 4.3 目录原则

- **`app/` 路由专用**：只放 Next.js 约定的 page/layout/route/error 文件
- **业务组件按域组织**：`components/editor/` 放编辑器相关，`components/preview/` 放预览相关
- **`lib/` 放纯函数/库**：无 React 依赖，可被服务端和客户端共用
- **就近原则**：仅一个页面使用的组件可与 page.tsx 同目录，超过 2 个页面共用则上提 `components/`
- **禁止深层嵌套**：目录层级不超过 4 层（`app/(admin)/interfaces/[id]/page.tsx` 是合法上限）

### 4.4 导入路径

- 全部使用 `@/` 绝对路径别名，对应项目根目录
- 跨层导入：`components/` 可引用 `lib/`，反之禁止
- 同层导入：使用相对路径 `./` 或同目录省略

---

## 5. 协作协议（子 Agent 工作流）

### 5.1 工作流模型

```
┌──────────────┐    派发 W1..Wn    ┌──────────────┐
│              │ ───────────────► │  Sub-Agent   │
│  Main Agent  │                  │  (Worker)    │
│              │ ◄─────────────── │              │
│  (本对话)    │    交付物 + 报告   └──────────────┘
└──────┬───────┘
       │ 验收
       ▼
  ✓ 通过 → 合并
  ✗ 不通过 → 反馈重做
```

### 5.2 子 Agent 工作规则

每个子 Agent 在被派发工作时，必须：

1. **通读本文件（AGENTS.md）**，确认自己负责的工作项在哪个 Phase、依赖什么
2. **只交付自己工作项范围内的产出**，禁止越界修改其他工作项的文件
3. **跨工作项的依赖**：通过主 Agent 协调，不直接修改其他工作项的文件
4. **输出报告格式**：完成时输出 `## 交付报告`，包含
   - 改动文件清单（绝对路径）
   - 关键实现说明（≤ 5 条）
   - 已知遗留问题（如有）
   - 建议的下一步验证项

### 5.3 主 Agent 验收清单

主 Agent 在收到子 Agent 交付后，按以下顺序验收：

- [ ] 文件路径与本文件 §4.2 目录结构一致
- [ ] 文件命名符合 §4.1 规范
- [ ] TypeScript strict 通过，无 `any`
- [ ] 依赖项均在 §2 白名单内
- [ ] API Route 的入参经过 Zod 校验
- [ ] 客户端组件最小化（无不必要的 `"use client"`）
- [ ] 关键功能点已在交付报告中列出
- [ ] 无修改其他工作项的文件
- [ ] 已运行 `pnpm lint` 与 `pnpm typecheck`（如已配置）

---

## 6. 工作项清单

> **并行性说明**：
> - 同一 Phase 内的子项默认**可并行**派发（除非显式标注依赖）
> - 跨 Phase 必须按顺序：Phase N 完成才能启动 Phase N+1
> - 每个工作项都是**独立交付**，对应一个子 Agent 的产出

### Phase 1 — 基础脚手架（顺序执行）

#### W1：项目初始化与基础架构

| 项 | 内容 |
| --- | --- |
| **范围** | 仓库脚手架、目录结构、技术栈接入、Docker Compose、Prisma 初始化 |
| **交付物** | 完整可启动的 Next.js 项目；`docker-compose.yml`（MySQL）；`.env.example`；`tsconfig.json`（path alias `@/`）；`tailwind.config.ts`（shadcn preset）；`lib/utils.ts`（cn 函数）；空目录骨架 |
| **依赖** | 无 |
| **下一步** | W1 完成后才能启动 W2、W3 |

**具体清单**：
- 初始化 `git` 仓库（首次 commit）
- `pnpm create next-app@latest`（App Router + TypeScript + Tailwind）
- 接入 shadcn/ui（`components.json`），先添加基础组件：`button input textarea select checkbox label card table dialog dropdown-menu tabs toast tooltip badge separator`
- 接入 Prisma：`prisma init --datasource-provider mysql`
- 创建 §4.2 列出的所有空目录与文件占位
- 配置 `next.config.ts`、`tsconfig.json`（strict + path alias）、`.eslintrc.json`、`.prettierrc`
- 编写 `docker-compose.yml`（MySQL 8.0 + Adminer）
- 编写 `.env.example`（`DATABASE_URL`、`PORT`）
- 编写 `README.md`（启动步骤）

#### W2：数据库 Schema

| 项 | 内容 |
| --- | --- |
| **范围** | Prisma schema、初始 migration、seed 脚本 |
| **交付物** | `prisma/schema.prisma`；首次 `prisma migrate dev` 生成的迁移文件；`prisma/seed.ts`（插入 5 条 mock interface 示例） |
| **依赖** | W1 |
| **下一步** | W2 完成后才能启动 Phase 2 |

**Schema 必含表**（DDL 见 PRD §5.2）：
- `mock_interface`（注意：**无 tags/methods 列**，GET/POST 通用）
- `global_config`
- `mock_request_log`
- `operation_log`

---

### Phase 2 — 后端核心库（可并行）

> 本 Phase 5 个工作项相互独立，可同时派发给 5 个子 Agent。

#### W3：Mock 引擎 `lib/mock-engine.ts`

| 项 | 内容 |
| --- | --- |
| **范围** | Mock.js 渲染、数组长度应用、locale 切换、错误模拟钩子 |
| **交付物** | `lib/mock-engine.ts`；`lib/__tests__/mock-engine.test.ts`（≥ 5 个测试用例） |
| **依赖** | W2（不需要 DB，但需要项目跑通） |
| **公开 API** | `renderMock(template: string, opts: { arrayLength: number; locale: 'zh-cn' \| 'en' }): unknown` |

#### W4：Thrift 解析器 `lib/thrift-parser.ts`

| 项 | 内容 |
| --- | --- |
| **范围** | 接入 thrift-parser 包，封装结构树输出、错误位置定位 |
| **交付物** | `lib/thrift-parser.ts`；`lib/__tests__/thrift-parser.test.ts`（≥ 5 个测试用例，含语法错误用例） |
| **依赖** | 无 |
| **公开 API** | `parseThrift(source: string): ThriftFile`（结构树）；`validateThrift(source): { valid: boolean; errors: ThriftError[] }` |

#### W5：Thrift → JSON 生成器 `lib/thrift-to-json.ts`

| 项 | 内容 |
| --- | --- |
| **范围** | 字段名 → 占位符的智能映射（PRD §3.2.2 规则表）、嵌套 struct 展开、list 生成 1 条示例 |
| **交付物** | `lib/thrift-to-json.ts`；`lib/__tests__/thrift-to-json.test.ts`（≥ 8 个测试用例） |
| **依赖** | W4（需要 ThriftFile 类型） |
| **公开 API** | `generateJsonTemplate(ast: ThriftFile, rootStructName?: string): string` |

**必须实现的字段名映射**（按 PRD §3.2.2）：
- `string email` → `@email`；`string nickname|name` → `@cname`；`string url|avatar` → `@image(...)`；其他 `string` → `@string`
- `i32 age|count` → `@integer(0,100)`；其他 `i32` → `@integer(1,10000)`
- `double` → `@float(0,1000,2,3)`；`bool` → `@boolean`
- `list<T>` → 数组嵌套对象生成 1 条示例

#### W6：JSON → Thrift 转换器 `lib/json-to-thrift.ts`

| 项 | 内容 |
| --- | --- |
| **范围** | 类型推断规则（PRD §3.3 表格） |
| **交付物** | `lib/json-to-thrift.ts`；`lib/__tests__/json-to-thrift.test.ts`（≥ 5 个测试用例） |
| **依赖** | 无 |
| **公开 API** | `jsonToThrift(json: unknown, opts: { namespace: string; rootName: string }): string` |

#### W7：占位符校验器 `lib/placeholder.ts`

| 项 | 内容 |
| --- | --- |
| **范围** | 已知占位符白名单、扫描 + 校验、合法/未知分类 |
| **交付物** | `lib/placeholder.ts`；`lib/__tests__/placeholder.test.ts`（≥ 5 个测试用例） |
| **依赖** | 无 |
| **公开 API** | `validatePlaceholders(text: string): { valid: string[]; unknown: string[] }` |

**白名单来源**：PRD §3.2.3 占位符表（约 17 个）

---

### Phase 3 — 后端 API（可并行）

> 本 Phase 4 个工作项相互独立。

#### W8：Mock HTTP 端点

| 项 | 内容 |
| --- | --- |
| **范围** | `/api/mock/[identifier]` GET + POST、错误模拟、延迟、日志记录 |
| **交付物** | `app/api/mock/[identifier]/route.ts`；`lib/render-mock.ts`（含错误率/延迟逻辑） |
| **依赖** | W2、W3 |
| **路由约定** | `ANY /api/mock/[identifier]`，命中查表，禁用→404，未匹配方法→405 |

#### W9：Mock 接口 CRUD API

| 项 | 内容 |
| --- | --- |
| **范围** | 列表 + 搜索 + 分页、详情、创建、更新、删除、启用/禁用切换、预览渲染 |
| **交付物** | 7 个 route.ts：`interfaces/route.ts`、`interfaces/[id]/route.ts`、`interfaces/[id]/toggle/route.ts`、`interfaces/[id]/preview/route.ts`、`interfaces/preview/route.ts` |
| **依赖** | W2、W3、W5、W7 |
| **入参校验** | 全部用 Zod schema；identifier 正则 `[a-z0-9_-]{3,64}` |

#### W10：全局配置 API

| 项 | 内容 |
| --- | --- |
| **范围** | 读取/更新全局配置（数组默认长度、locale、错误模拟开关、日志保留天数） |
| **交付物** | `app/api/config/route.ts`；Zod schema |
| **依赖** | W2 |

#### W11：转换/校验 API

| 项 | 内容 |
| --- | --- |
| **范围** | JSON→Thrift 转换、Thrift 语法校验、日志查询 |
| **交付物** | 3 个 route.ts：`json-to-thrift/route.ts`、`thrift-validate/route.ts`、`logs/route.ts`；`app/api/health/route.ts`（健康检查） |
| **依赖** | W4、W6、W2 |

---

### Phase 4 — 管理后台 UI（可并行）

> 本 Phase 6 个工作项相互独立。W12 必须最先完成（提供 Sidebar 与共享布局）。

#### W12：共享布局 + Sidebar

| 项 | 内容 |
| --- | --- |
| **范围** | `(admin)/layout.tsx`、Sidebar 导航组件、错误边界 |
| **交付物** | `app/(admin)/layout.tsx`、`components/layout/Sidebar.tsx`、`app/error.tsx` |
| **依赖** | W1（shadcn 已就绪） |

#### W13：列表页

| 项 | 内容 |
| --- | --- |
| **范围** | 搜索、状态筛选、表格、分页、统计卡片、复制/编辑/预览/删除操作 |
| **交付物** | `app/(admin)/page.tsx`；`components/MockInterfaceTable.tsx`；`components/SearchBar.tsx`；`components/StatsCards.tsx` |
| **依赖** | W9、W12 |

**关键 UX**（来自原型 `list.html`）：
- 搜索框放在表格卡片内部（不要放顶部粘性栏，避免全局搜索歧义）
- 搜索框右侧实时显示「命中 X / 共 Y 条」
- 表格列：接口名称、唯一标识、状态、最近请求、更新时间、操作（**无 标签/方法 列**）

#### W14：编辑页

| 项 | 内容 |
| --- | --- |
| **范围** | Thrift 编辑器、生成 JSON 模板按钮、JSON 模板编辑器、占位符速查、实时预览、删除确认 |
| **交付物** | `app/(admin)/interfaces/new/page.tsx`、`app/(admin)/interfaces/[id]/page.tsx`、`components/editor/ThriftEditor.tsx`、`components/editor/JsonTemplateEditor.tsx`、`components/editor/PlaceholderHelper.tsx`、`components/preview/ResponsePreview.tsx` |
| **依赖** | W4、W5、W7、W9、W12 |

**关键 UX**（来自原型 `edit.html`）：
- Thrift 区域：可编辑 `<textarea>` + "生成 JSON 模板" 主按钮 + "上次生成于 X" 状态行
- JSON 区域：可编辑 `<textarea>` + "格式化" + "从 Thrift 重新生成" 按钮
- 实时预览（右侧 sticky）：Mock.js 渲染结果，每次 Thrift/JSON 变更触发刷新

#### W15：转换器页

| 项 | 内容 |
| --- | --- |
| **范围** | JSON 输入、Thrift 输出、类型推断 chip、推断规则表、下载 |
| **交付物** | `app/(admin)/converter/page.tsx`；`components/JsonToThriftConverter.tsx` |
| **依赖** | W11、W12 |

#### W16：预览页

| 项 | 内容 |
| --- | --- |
| **范围** | 客户端请求构造（GET/POST、Params、Headers、Body）、响应查看器、历史响应列表 |
| **交付物** | `app/(admin)/preview/page.tsx`；`components/RequestBuilder.tsx`；`components/ResponseViewer.tsx` |
| **依赖** | W8、W11、W12 |

#### W17：设置页

| 项 | 内容 |
| --- | --- |
| **范围** | 全局配置表单（数组默认长度、Mock.js 区域、错误模拟开关、日志保留天数）、系统信息、危险操作区 |
| **交付物** | `app/(admin)/settings/page.tsx`；`components/SettingsForm.tsx` |
| **依赖** | W10、W12 |

---

### Phase 5 — 中间件与部署（可并行）

#### W18：中间件（限流 + 日志 + 健康检查）

| 项 | 内容 |
| --- | --- |
| **范围** | IP 频率限制（600 req/min）、请求日志、错误日志、健康检查 |
| **交付物** | `middleware.ts`、`lib/logger.ts`、`lib/rate-limit.ts` |
| **依赖** | W2 |

#### W19：Docker 化与文档

| 项 | 内容 |
| --- | --- |
| **范围** | 生产用 Dockerfile、多服务 docker-compose.yml（app + db）、启动/部署文档 |
| **交付物** | `Dockerfile`（多阶段构建）、`docker-compose.yml`（生产）、更新 `README.md` |
| **依赖** | W1-W17 全部完成 |

---

## 7. 验收补充规则

- **接口一致性**：所有 API 入参与返回结构必须与 PRD §5.3 完全一致
- **错误响应统一**：所有 4xx/5xx 返回 `{ code: number, message: string, requestId?: string }`
- **GET/POST 通用**：Mock 接口路径 `ANY /mock/:identifier`，**禁止**在接口级配置 methods
- **数组长度优先级**：接口 `array_length` > 全局配置 > 默认 3
- **Mock.js locale**：默认 `zh-cn`，与 PRD §3.5 一致
- **频率限制**：mock 接口每 IP 600 req/min（PRD §4.5）

---

## 8. 启动命令速查

| 用途 | 命令 |
| --- | --- |
| 启动 MySQL | `docker compose up -d mysql` |
| 数据库迁移 | `pnpm prisma migrate dev` |
| Seed 数据 | `pnpm prisma db seed` |
| 启动开发服务器 | `pnpm dev` |
| 类型检查 | `pnpm typecheck` |
| Lint | `pnpm lint` |
| 格式化 | `pnpm format` |
| 测试 | `pnpm test` |

---

## 9. 版本

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v1.0 | 2026-09-30 | 初稿 |