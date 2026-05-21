# HALOME Platform

光宇开放平台 — 企业级 AI 云服务管理平台

## 项目简介

HALOME 是杭州光宇云计算科技有限公司推出的开放平台，提供 AI 模型推理、云存储、企业空间管理等服务。本项目是平台的Web前端及后端 API 服务。

## 技术栈

### 前端
- 纯静态 HTML + CSS + JavaScript（无框架依赖）
- 响应式布局，适配桌面端

### 后端
- Node.js + Express
- better-sqlite3（SQLite 数据库）
- jsonwebtoken（JWT 认证）

## 快速启动

### 1. 安装后端依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，根据需要修改：

```bash
cp server/.env.example server/.env
```

### 3. 启动后端服务

```bash
cd server
node server.js
```

服务默认运行在 `http://localhost:3000`。

### 4. 访问前端

后端启动后会自动服务前端静态文件，访问 `http://localhost:3000` 即可。

## 项目结构

```
├── index.html              # 充值/计费首页
├── login.html              # 登录页
├── js/                    # 前端 JS
│   ├── auth.js            # 认证逻辑（JWT Token）
│   ├── sidebar.js         # 侧边栏渲染
│   └── modal.js           # 全局模态框工具
├── css/                   # 样式文件
├── pages/                 # 各功能页面
│   ├── console-dashboard.html   # 控制台首页
│   ├── account-info.html        # 账户信息
│   ├── account-bills.html       # 账单
│   └── api-docs/               # API 文档
└── server/                # 后端服务
    ├── server.js          # 主服务文件
    ├── package.json
    └── .env.example      # 环境变量模板
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sms/send` | 发送短信验证码 |
| POST | `/api/auth/login` | 手机号+验证码登录 |
| GET | `/api/auth/me` | 获取当前登录用户信息 |
| POST | `/api/auth/logout` | 退出登录 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `JWT_SECRET` | JWT 签名密钥 | `your-secret-key-change-in-production` |
| `DB_PATH` | SQLite 数据库路径 | `./halome.db` |
| `SM_SEND_URL` | 短信发送 URL（生产环境配置真实服务商） | - |

## 生产部署注意事项

1. **修改 JWT_SECRET**：生产环境必须使用强密钥
2. **接入真实短信服务**：当前 `server.js` 中短信发送为模拟（console.log），需接入阿里云/腾讯云 SMS
3. **HTTPS**：生产环境必须启用 HTTPS
4. **数据库备份**：定期备份 `halome.db`

## License

See [LICENSE](LICENSE) file.

## 公司信息

- 公司：杭州光宇云计算科技有限公司
- 服务热线：请联系销售人员获取
