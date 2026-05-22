# 🔍 Vibe Coding Father — 工程化审查报告

> 审查时间：2026-05-22T14:17+08:00  
> 项目路径：`/Users/kkk/WorkBuddy/2026-05-22-14-17-47/halome-platform`  
> 项目类型：前后端一体 Web 应用（纯静态前端 + Express API 后端）  
> 严格程度：strict  
> 通过项/总检查项：**13/20**  
> **总体判定：CONDITIONAL_PASS** ⚠️

## 📋 检查结果摘要

| 维度 | 通过 | 未通过 | 严重问题 |
|------|------|--------|---------|
| 架构边界与分层 | 3/5 | 2 | 1 |
| 业务逻辑独立性 | 2/4 | 2 | 1 |
| 可维护性 | 3/6 | 3 | 1 |
| 安全性 | 5/5 | 0 | 0 |

---

## 🔴 阻塞性问题（必须解决）

### 🔴 架构问题 #1 — 后端单体巨石文件 [置信度：确定]

- **位置**：`server/server.js`（527 行）
- **问题描述**：所有后端逻辑——数据库初始化、JWT 认证、短信发送、仪表盘 API、账单 API、套餐 API、存储 API、推理 API、AI 模型 API、企业云盘 API——全部塞在一个文件里。一个 `server.js` 承担了路由、控制器、服务、数据访问四层职责。
- **工程后果**：每加一个新 API 都在往同一个文件填代码。很快这个文件就会破千行、两千行。改一个路由可能误伤另一个路由，重构成本指数增长。
- **修复建议**：
  ```
  server/
    server.js          # 入口，只负责 app 启动和中间件挂载
    routes/            # 路由定义（auth.js, dashboard.js, storage.js, ...）
    middleware/        # 中间件（auth.js, cors.js）
    db/                # 数据库初始化 + prepared statements
    services/          # 业务逻辑（authService.js, dashboardService.js, ...）
  ```
- **忽略方式**：`// vibe-ignore: architecture.single-file-monolith`

### 🔴 架构问题 #2 — `closeModal` 被页面内多次重新定义 [置信度：确定]

- **位置**：5 个 HTML 文件中重新定义了 `closeModal` 函数
  - `index.html:384` — `function closeModal(id) { ... }`
  - `pages/account-announcements.html`
  - `pages/enterprise-disk.html:1215`
  - `pages/account-info.html`
  - `pages/console-monitoring.html`
- **问题描述**：`js/modal.js` 已提供全局 `closeModal` 函数，但多个页面在自己的内联 `<script>` 中重新定义同名函数，**shadow 掉了公共版本**。这意味着页面可能存在两个行为不一致的 `closeModal`。
- **工程后果**：一个页面改 closeModal 行为不影响其他页面（预期），但如果哪天统一逻辑改了 modal.js 版本，这些 shadow 版本不会更新，产生隐性 bug。
- **修复建议**：统一使用 `js/modal.js` 的全局版本；页面特有逻辑（如清除表单错误）改为监听 modal 关闭事件或覆盖局部行为。
- **忽略方式**：`// vibe-ignore: architecture.close-modal-shadow`

### 🔴 可维护性问题 #1 — 0% 测试覆盖率 [置信度：确定]

- **位置**：全项目（无 `*.test.js`, `*.spec.js`, `test/` 目录）
- **问题描述**：项目中没有任何自动化测试——没有单元测试、没有集成测试、没有 E2E 测试。
- **工程后果**：每次修改代码后只能手动点点页面验证。532 行的 JWT 认证逻辑、527 行的 API 路由，一个 Typo 就能把登录搞崩，而你不会知道直到用户报 bug。
- **修复建议**：
  1. 优先给 `server.js` 中的认证中间件 `verifyToken` 写单元测试
  2. 给 `signToken`、`generateSmsCode` 写测试
  3. 给关键 API 路由写集成测试（auth/login, auth/me）
  4. 使用 `vitest` 或 `jest` + `supertest`
- **忽略方式**：N/A（无测试不可忽略）

### 🔴 业务逻辑问题 #1 — 硬编码演示数据污染 API 响应 [置信度：确定]

- **位置**：`server/server.js:247-262`（dashboard API）
- **问题描述**：`/api/dashboard` 接口中，通过 `INSERT OR IGNORE` 在每次请求时向数据库塞入演示数据——

```js
const stmtEnsureAccount = db.prepare(
  'INSERT OR IGNORE INTO accounts (user_id, balance, coupon) VALUES (?, 1000, 500)'
);
stmtEnsureAccount.run(userId);
// ... 同样插入演示空间、AI 模型、企业云盘数据
```

- **工程后果**：这是"GET 请求有副作用"的典型反模式。每次访问仪表盘都会往数据库写数据。如果某天需要做数据统计、数据迁移，这些演示数据会污染真实数据。而且它让 API 不再是纯查询操作。
- **修复建议**：将演示数据初始化移到数据库 seed 脚本中，通过 `npm run seed` 或首次启动时一次性执行。API 层只做查询，不做写入。
- **忽略方式**：`// vibe-ignore: business.side-effect-in-get`

---

## 🟡 一般性问题（建议修复）

### 🟡 安全建议 #1 — JWT_SECRET 有硬编码回退值 [置信度：确定]

- **位置**：`server/server.js:16`
- **问题描述**：`const JWT_SECRET = process.env.JWT_SECRET || 'halome-dev-secret-change-in-prod';`
- **工程后果**：如果运维忘记设置 `JWT_SECRET` 环境变量，生产环境会使用明文回退密钥，任何人可以伪造 JWT。
- **修复建议**：生产环境启动时检查 `JWT_SECRET` 必须存在，否则拒绝启动：
  ```js
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET is required in production');
    process.exit(1);
  }
  const JWT_SECRET = process.env.JWT_SECRET || 'halome-dev-secret-change-in-prod';
  ```

### 🟡 安全建议 #2 — 开发模式短信验证码返回前端 [置信度：确定]

- **位置**：`server/server.js:160-168`
- **问题描述**：`NODE_ENV !== 'production'` 时，验证码通过 `dev_code` 字段返回给前端，且在 login.html 中以 toast 明文显示。
- **工程后果**：如果某次部署没改 `NODE_ENV=production`，验证码会在浏览器端可见，短信验证形同虚设。
- **修复建议**：生产检查清单中加一项"确认 NODE_ENV"；或改为仅在 `localhost` 来源时才返回 dev_code。

### 🟡 架构建议 #1 — `API_BASE` 硬编码为 localhost [置信度：确定]

- **位置**：`js/auth.js:10`
- **问题描述**：`var API_BASE = 'http://localhost:3000';`，注释说"生产环境部署时改为空字符串"，但这意味着部署前需要改代码。
- **工程后果**：代码和环境耦合。部署到不同环境（staging、production）需要手动改这个值。
- **修复建议**：将 `API_BASE` 改为空字符串（同域部署），或通过前端构建时注入环境变量。

### 🟡 CSS 问题 #1 — Toast 样式在两处重复定义 [置信度：确定]

- **位置**：`login.html` (行 145-172) 和 `pages/enterprise-disk.html` (行 290-315)
- **问题描述**：Toast 样式已经在 `css/theme.css`（行 1111-1138）中完整定义，但 login.html 和 enterprise-disk.html 各自又复制了一份几乎一样的 CSS。
- **工程后果**：如果要改 Toast 样式，需要改 3 个地方。而且 login.html 的 `.toast.success` 透明度是 `0.15`，theme.css 是 `0.15`，enterprise-disk.html 却是 `0.2`——已经出现了不一致。
- **修复建议**：删除页面内的重复 Toast CSS，统一使用 theme.css 的全局定义。

### 🟡 可维护性 #2 — 大量 inline `onclick` 处理器 [置信度：较确定]

- **位置**：`pages/enterprise-disk.html`（38 处）, `pages/console-dashboard.html`（21 处）, `pages/account-info.html`（26 处）等
- **问题描述**：HTML 中直接使用 `onclick="someFunction()"`，函数定义在页面的内联 `<script>` 中。这导致 JavaScript 行为与 DOM 紧耦合，难以重构。
- **工程后果**：添加 CSP 策略时会被 `unsafe-inline` 卡住；重构按钮行为时需要同时改 HTML 和 JS。
- **修复建议**：逐步迁移到 `addEventListener` 模式。当前阶段对纯静态站可接受，但随着项目规模增长会成为债务。

### 🟡 架构问题 #3 — 用户名硬编码 `'杭州七七八八久久有限公司'` [置信度：确定]

- **位置**：`server/server.js:270`，多处 API 响应
- **问题描述**：所有后端返回的 `userName` 都写死为 `'杭州七七八八久久有限公司'`，而不是从数据库中的用户表读取。
- **工程后果**：多用户场景下所有用户看到的都是同一个公司名。用户表已有 `users` 表但未存储公司名称字段。
- **修复建议**：在 `users` 表增加 `company_name` 字段，API 响应从数据库读取真实值。

---

## 🟢 建议性问题（可选优化）

### 🟢 `console.log` 残留 — 后端生产代码

- **位置**：`server/server.js:161, 524-526`
- **问题描述**：`console.log('[DEV] 短信验证码 ...')` 和启动日志。启动日志可接受，但验证码日志应该在生产环境关闭。
- **建议**：使用结构化日志库（如 `pino`）替代 `console.log`，根据环境级别过滤。

### 🟢 `bcryptjs` 已安装但未使用

- **位置**：`server/package.json` 依赖了 `bcryptjs`，`server.js:26` 表中有 `password_hash` 列
- **问题描述**：当前登录仅用短信验证码，未实现密码登录。`bcryptjs` 和 `password_hash` 列是僵尸代码。
- **建议**：要么实现密码登录功能，要么删除未使用的依赖和列。

### 🟢 `LICENSE` 文件内容为空

- **位置**：`./LICENSE`
- **建议**：填写实际使用的许可证类型（MIT/Apache-2.0 等）。

### 🟢 `tab-content` CSS 缺少 `.tab-content.active` 规则

- **位置**：`css/theme.css` — 主题文件未定义 `.tab-content.active { display: block; }`
- **问题描述**：index.html 和 console-dashboard.html 各自在页面内定义了此规则，但主题文件中缺漏。
- **建议**：将 `.tab-content { display: none; } .tab-content.active { display: block; }` 加入 theme.css。

---

## ✨ 做得好的地方

| 方面 | 说明 |
|------|------|
| SQL 注入防护 | 全部使用 `db.prepare()` 参数化查询，无字符串拼接，**满分** ✅ |
| JWT 认证中间件 | `verifyToken` 设计干净，正确提取 Bearer Token 并验证，错误码准确 |
| CSS Design System | `theme.css` 的 CSS 变量体系完整，暗色主题一致性好，1227 行覆盖全面 |
| 前端输入校验 | 手机号正则验证 `^1[3-9]\d{9}$`，前后端双重校验 |
| 短信防刷 | 60 秒间隔限制 + 验证码标记为 used，基础防护到位 |
| CORS 配置 | 使用了 `cors` 中间件，避免跨域问题 |
| 项目文档 | README 结构清晰，技术栈/启动步骤/API 表格/环境变量一应俱全 |
| 0 npm 漏洞 | `npm audit` 扫描 122 个包，0 个已知漏洞 ✅ |
| 目录结构 | 前端 `js/`、`css/`、`pages/` 分层清晰，server 独立目录 |
| UI 细节 | 登录页倒计时、Toast 动画、树形控件 rename 内联编辑，用户体验打磨用心 |

---

## 📊 检查结果明细

| # | 检查项 | 严重级别 | 结果 |
|---|--------|---------|------|
| 1.1 | 业务逻辑独立于基础设施？ | 🔴 严重 | ❌ — 后端 API 路由和数据库操作同文件，未分层 |
| 1.2 | 依赖方向正确？ | 🔴 严重 | ⚠️ — 无明确分层，但依赖方向无明显错误 |
| 1.3 | 无跨层直接调用？ | 🔴 严重 | ✅ — 前端 JS 通过 fetch → 后端 API，无跨层 |
| 1.4 | 模块边界清晰？ | 🟡 一般 | ❌ — `server.js` 承担过多职责 |
| 1.5 | 无循环依赖？ | 🔴 严重 | ✅ — 简单项目，无循环依赖风险 |
| 2.1 | 业务逻辑与技术选型解耦？ | 🔴 严重 | ❌ — API 逻辑混在 Express 路由回调中 |
| 2.2 | 使用接口/契约？ | 🔴 严重 | ✅ — 前端通过 HTTP API 与后端解耦 |
| 2.3 | 无魔法字符串？ | 🟡 一般 | ❌ — 硬编码公司名、演示余额值 |
| 2.4 | 基础设施可替换？ | 🟡 一般 | ✅ — SQLite 可通过改 `DB_PATH` 替换，迁移成本低 |
| 3.1 | 命名与模式一致？ | 🟡 一般 | ✅ — 驼峰命名一致，使用 `prepare` 模式 |
| 3.2 | 业务逻辑未泄漏？ | 🔴 严重 | ❌ — 路由中直接写业务规则 |
| 3.3 | DRY 原则？ | 🟡 一般 | ❌ — Toast CSS、closeModal 重复定义 |
| 3.4 | 测试覆盖率？ | 🔴 严重 | ❌ — 0% |
| 3.5 | TODO/FIXME 未处理？ | 🟢 建议 | ✅ — 仅一处开发提醒注释（⚠️ 短信验证码） |
| 3.6 | 文档与代码同步？ | 🟢 建议 | ✅ — README API 表格与代码一致 |
| 4.1 | SQL 无注入风险？ | 🔴 严重 | ✅ — 全部参数化查询 |
| 4.2 | 无不安全默认配置？ | 🔴 严重 | ⚠️ — JWT_SECRET 有回退值 |
| 4.3 | 无硬编码敏感信息？ | 🔴 严重 | ✅ — 无密码/密钥硬编码（JWT_SECRET 仅回退） |
| 4.4 | 依赖无已知漏洞？ | 🟡 一般 | ✅ — `npm audit` 0 漏洞 |
| 4.5 | 输入验证充分？ | 🔴 严重 | ✅ — 前后端双向校验 |

> 通过 ✅：13 / 未通过 ❌：7

---

## 📌 下一步行动清单

1. [ ] 🔴 **拆分 `server.js`** — 将 527 行的单体文件拆分为 routes/ middleware/ db/ services/
2. [ ] 🔴 **添加最小测试覆盖** — 至少覆盖 `verifyToken`、`signToken`、`auth/login`、`auth/me`
3. [ ] 🔴 **移除 API 中的 INSERT 副作用** — 将演示数据初始化迁移到 seed 脚本
4. [ ] 🟡 **生产环境强制 JWT_SECRET** — 添加 `NODE_ENV=production` 时缺少密钥的启动检查
5. [ ] 🟡 **统一 closeModal** — 删除页面内 shadow 版本，统一使用 `js/modal.js`
6. [ ] 🟡 **删除重复 Toast CSS** — login.html 和 enterprise-disk.html 中的 Toast 样式改用 theme.css
7. [ ] 🟡 **`API_BASE` 配置化** — 改为空字符串或环境可配
8. [ ] 🟡 **从数据库读取 userName** — 替换硬编码的 `'杭州七七八八久久有限公司'`
9. [ ] 🟢 **theme.css 补充 `.tab-content.active`** — 统一标签页显示规则
10. [ ] 🟢 **清理未使用依赖** — `bcryptjs` 要么用起来要么删掉
11. [ ] 🟢 **填写 LICENSE 文件** — 选择合适的开源协议
