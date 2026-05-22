/**
 * HALOME 光宇开放平台 - 后端入口
 * 职责：中间件挂载 + 路由注册 + 静态文件服务 + 启动
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── 中间件 ───────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ─── 健康检查 ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'halome-platform', timestamp: Date.now() });
});

// ─── 路由挂载 ─────────────────────────────────────────────────
require('./routes/auth')(app);
require('./routes/dashboard')(app);
require('./routes/bills')(app);
require('./routes/plans')(app);
require('./routes/resource-stats')(app);
require('./routes/storage')(app);
require('./routes/inference')(app);
require('./routes/ai-models')(app);
require('./routes/enterprise-disk')(app);

// ─── 404 兜底 ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// ─── 启动 ───────────────────────────────────────────────────
// 生产环境强制检查 JWT_SECRET
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is required in production');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`✅ HALOME 后端服务已启动：http://localhost:${PORT}`);
  console.log(`   环境：${process.env.NODE_ENV || 'development'}`);
});
