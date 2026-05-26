# HALOME Platform

**光宇开放平台** — 杭州光宇云计算科技有限公司企业级 AI 云服务管理平台。

提供 AI 模型推理、云存储、企业空间管理、计费账单等服务。前端纯静态 HTML，后端 Node.js + Express + SQLite。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | 纯静态 HTML + CSS + JavaScript（零框架依赖） |
| 后端 | Node.js + Express |
| 数据库 | better-sqlite3（SQLite） |
| 认证 | JWT（jsonwebtoken） |
| 测试 | Vitest |
| 短信 | 模拟（console.log），接入真实服务商后可用 |

## 快速启动

```bash
# 1. 安装后端依赖
cd server && npm install

# 2. 配置环境变量（可选，开发模式有默认值）
cp .env.example .env

# 3. 启动服务（自动初始化数据库 + 种子数据）
node server.js
# → http://localhost:3000
```

前端静态文件由 Express 自动 serve，无需额外启动前端服务器。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `JWT_SECRET` | JWT 签名密钥 | `your-secret-key-change-in-production` |
| `DB_PATH` | SQLite 数据库路径 | `./halome.db` |
| `SM_SEND_URL` | 短信发送 URL | - |

## 页面结构

### 公开页面
| 文件 | 路由 | 说明 |
|------|------|------|
| `index.html` | `/` | 充值/计费首页 |
| `login.html` | `/login.html` | 手机号 + 验证码登录 |

### 控制台
| 文件 | 说明 |
|------|------|
| `pages/console-dashboard.html` | 控制台仪表盘（概览统计） |
| `pages/console-storage.html` | 云存储管理 |
| `pages/console-inference.html` | AI 推理服务管理 |
| `pages/console-ai-model.html` | AI 模型列表 |
| `pages/console-ai-model-import.html` | 导入/上传自定义模型 |
| `pages/console-monitoring.html` | 系统监控 |
| `pages/enterprise-disk.html` | 企业云盘 |

### 账户管理
| 文件 | 说明 |
|------|------|
| `pages/account-info.html` | 账户信息/个人资料 |
| `pages/account-bills.html` | 账单与消费记录 |
| `pages/account-resource.html` | 资源使用统计 |
| `pages/account-announcements.html` | 系统公告 |

### API 文档
| 文件 | 说明 |
|------|------|
| `pages/api-docs/overview.html` | API 概述 |
| `pages/api-docs/product-intro.html` | 产品介绍 |
| `pages/api-docs/get-token.html` | 获取 Access Token |
| `pages/api-docs/gateway-nodes.html` | 网关节点 |
| `pages/api-docs/user-storage.html` | 用户存储 |
| `pages/api-docs/file-list.html` | 文件列表 |
| `pages/api-docs/upload-small.html` | 小文件上传 |
| `pages/api-docs/upload-large.html` | 大文件分片上传 |
| `pages/api-docs/download.html` | 文件下载 |
| `pages/api-docs/delete-file.html` | 文件删除 |
| `pages/api-docs/sdk.html` | SDK 文档 |

## API 接口

### 认证
| 方法 | 路径 | 路由文件 | 说明 |
|------|------|----------|------|
| POST | `/api/sms/send` | `routes/auth.js` | 发送短信验证码 |
| POST | `/api/auth/login` | `routes/auth.js` | 手机号+验证码登录 |
| GET | `/api/auth/me` | `routes/auth.js` | 获取当前用户信息 |
| POST | `/api/auth/logout` | `routes/auth.js` | 退出登录 |

### 业务接口
| 方法 | 路径 | 路由文件 | 说明 |
|------|------|----------|------|
| GET | `/api/dashboard/stats` | `routes/dashboard.js` | 仪表盘统计数据 |
| GET | `/api/storage/*` | `routes/storage.js` | 云存储操作 |
| GET/POST | `/api/inference/*` | `routes/inference.js` | AI 推理接口 |
| GET/POST | `/api/ai-models/*` | `routes/ai-models.js` | AI 模型管理 |
| GET/POST | `/api/enterprise-disk/*` | `routes/enterprise-disk.js` | 企业云盘 |
| GET | `/api/plans` | `routes/plans.js` | 套餐方案 |
| GET | `/api/bills` | `routes/bills.js` | 账单查询 |
| GET | `/api/resource-stats` | `routes/resource-stats.js` | 资源统计 |

## 项目结构

```
halome-platform/
├── index.html                     # 计费首页
├── login.html                     # 登录页
├── test-api.html                  # API 测试页
├── LICENSE                        # MIT
├── css/                           # 全局样式
├── js/                            # 前端公共 JS
│   ├── auth.js                    # JWT 认证 + Token 管理
│   ├── sidebar.js                 # 侧边栏渲染
│   └── modal.js                   # 全局模态框
├── pages/                         # 功能页面
│   ├── console-*.html             # 控制台系列
│   ├── account-*.html             # 账户系列
│   ├── enterprise-disk.html       # 企业云盘
│   └── api-docs/                  # API 文档（11 页）
└── server/                        # 后端
    ├── server.js                  # 主入口（Express + 静态文件 serve）
    ├── db/
    │   ├── index.js               # SQLite 初始化 + 迁移
    │   └── seed.js                # 种子数据
    ├── middleware/
    │   └── auth.js                # JWT 认证中间件
    ├── routes/                    # API 路由（9 个模块）
    │   ├── auth.js
    │   ├── dashboard.js
    │   ├── storage.js
    │   ├── inference.js
    │   ├── ai-models.js
    │   ├── enterprise-disk.js
    │   ├── plans.js
    │   ├── bills.js
    │   └── resource-stats.js
    ├── utils/
    │   └── token.js               # Token 生成/验证工具
    └── __tests__/                 # Vitest 单元测试
        ├── auth-middleware.test.js
        ├── auth-routes.test.js
        └── token.test.js
```

## 测试

```bash
cd server
npm test
# 或
npx vitest run
```

## 生产部署

1. **修改 JWT_SECRET** — 使用 `openssl rand -hex 32` 生成强密钥
2. **接入真实短信服务** — 修改 `server.js` 中的短信发送逻辑，对接阿里云/腾讯云 SMS
3. **启用 HTTPS** — 使用 Nginx 反向代理或 Express HTTPS
4. **数据库备份** — 定期备份 `halome.db` 文件
5. **进程守护** — 使用 PM2 `pm2 start server.js --name halome`

## License

MIT © 杭州光宇云计算科技有限公司
