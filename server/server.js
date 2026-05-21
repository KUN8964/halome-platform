/**
 * HALOME 光宇开放平台 - 后端服务
 * 功能：短信验证码（模拟）、用户认证、JWT Token、API 代理
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'halome-dev-secret-change-in-prod';
const JWT_EXPIRES_IN = '7d';

// ─── 数据库初始化 ─────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'halome.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    last_login_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS sms_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    used INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

  -- 账户表（余额、抵扣券）
  CREATE TABLE IF NOT EXISTS accounts (
    user_id INTEGER PRIMARY KEY,
    balance REAL DEFAULT 0,
    coupon REAL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- 云空间表
  CREATE TABLE IF NOT EXISTS spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT '标准存储',
    status TEXT DEFAULT '使用中',
    api_key TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- AI 模型表
  CREATE TABLE IF NOT EXISTS ai_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT '运行中',
    revenue REAL DEFAULT 0,
    calls INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- 企业云盘表
  CREATE TABLE IF NOT EXISTS enterprise_disks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    enterprise_code TEXT,
    used_gb REAL DEFAULT 0,
    total_gb REAL DEFAULT 0,
    expiry_date TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const stmtInsertCode = db.prepare(
  'INSERT INTO sms_codes (phone, code) VALUES (?, ?)'
);
const stmtFindCode = db.prepare(
  'SELECT code, used FROM sms_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1'
);
const stmtMarkCodeUsed = db.prepare(
  'UPDATE sms_codes SET used = 1 WHERE phone = ? AND code = ?'
);
const stmtFindUser = db.prepare('SELECT * FROM users WHERE phone = ?');
const stmtInsertUser = db.prepare(
  'INSERT INTO users (phone, created_at) VALUES (?, ?)'
);
const stmtUpdateLogin = db.prepare(
  'UPDATE users SET last_login_at = ? WHERE phone = ?'
);

// ─── 工具函数 ─────────────────────────────────────────────────
function generateSmsCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录或 Token 已过期' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token 无效或已过期' });
  }
}

// ─── 中间件 ───────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname, '..')));

// ─── 健康检查 ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'halome-platform', timestamp: Date.now() });
});

// ─── 发送短信验证码 ──────────────────────────────────────────
// POST /api/sms/send
// Body: { phone: string }
app.post('/api/sms/send', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: '手机号格式不正确' });
  }

  const code = generateSmsCode();
  const now = Math.floor(Date.now() / 1000);

  // 60秒内不能重复发送（防刷）
  const recent = db.prepare(
    'SELECT id FROM sms_codes WHERE phone = ? AND created_at > ? AND used = 0'
  ).get(phone, now - 60);
  if (recent) {
    return res.status(429).json({ success: false, message: '请稍后再试（60秒间隔）' });
  }

  stmtInsertCode.run(phone, code);

  // ⚠️ 开发环境：把验证码返回给前端（生产环境删除此行，改为调用短信服务商 API）
  console.log(`[DEV] 短信验证码 phone=${phone} code=${code}`);

  res.json({
    success: true,
    message: '验证码已发送',
    // 开发模式下返回验证码方便测试，生产环境不返回
    ...(process.env.NODE_ENV !== 'production' ? { dev_code: code } : {}),
  });
});

// ─── 手机号 + 验证码登录 / 注册 ─────────────────────────────
// POST /api/auth/login
// Body: { phone: string, code: string }
app.post('/api/auth/login', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ success: false, message: '手机号和验证码不能为空' });
  }

  // 验证验证码
  const record = stmtFindCode.get(phone);
  if (!record || record.code !== code || record.used) {
    return res.status(400).json({ success: false, message: '验证码错误或已过期' });
  }

  // 标记验证码已使用
  stmtMarkCodeUsed.run(phone, code);

  // 查找或创建用户
  let user = stmtFindUser.get(phone);
  const isNew = !user;
  const now = Math.floor(Date.now() / 1000);

  if (isNew) {
    stmtInsertUser.run(phone, now);
    user = stmtFindUser.get(phone);
  } else {
    stmtUpdateLogin.run(now, phone);
  }

  // 签发 JWT
  const token = signToken({ userId: user.id, phone: user.phone });

  res.json({
    success: true,
    isNew,
    message: isNew ? '注册成功，欢迎加入 HALOME' : '登录成功，欢迎回来',
    data: {
      token,
      user: { phone: user.phone, createdAt: user.created_at },
    },
  });
});

// ─── 登出（前端清除 Token 即可，此处仅作日志）───────────────
// POST /api/auth/logout
app.post('/api/auth/logout', (_req, res) => {
  res.json({ success: true, message: '已登出' });
});

// ─── 获取当前登录用户信息 ───────────────────────────────────
// GET /api/auth/me
app.get('/api/auth/me', verifyToken, (req, res) => {
  const user = stmtFindUser.get(req.user.phone);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  res.json({
    success: true,
    data: { phone: user.phone, createdAt: user.created_at, lastLoginAt: user.last_login_at },
  });
});

// ─── 仪表盘数据 API ───────────────────────────────────────
// GET /api/dashboard?tab=cloud|ai|disk
app.get('/api/dashboard', verifyToken, (req, res) => {
  const { tab = 'cloud' } = req.query;
  const userId = req.user.userId;

  // 确保账户存在
  const stmtEnsureAccount = db.prepare(
    'INSERT OR IGNORE INTO accounts (user_id, balance, coupon) VALUES (?, 1000, 500)'
  );
  stmtEnsureAccount.run(userId);

  // 确保演示空间存在
  const stmtEnsureSpace = db.prepare(
    'INSERT OR IGNORE INTO spaces (user_id, name, type, status, api_key) VALUES (?, ?, ?, ?, ?)'
  );
  stmtEnsureSpace.run(userId, '测试空间', '标准存储', '使用中', 'ak-demo-****');

  // 确保 AI 模型存在
  const stmtEnsureModel = db.prepare(
    'INSERT OR IGNORE INTO ai_models (user_id, name, status, revenue, calls) VALUES (?, ?, ?, ?, ?)'
  );
  stmtEnsureModel.run(userId, 'Model-X', '运行中', 4536.99, 35190);

  // 确保企业云盘存在
  const stmtEnsureDisk = db.prepare(
    'INSERT OR IGNORE INTO enterprise_disks (user_id, enterprise_code, used_gb, total_gb, expiry_date) VALUES (?, ?, ?, ?, ?)'
  );
  stmtEnsureDisk.run(userId, 'QSCG', 0, 0, '2027-05-20');

  if (tab === 'cloud') {
    const account = db.prepare('SELECT * FROM accounts WHERE user_id = ?').get(userId);
    const spaces = db.prepare('SELECT * FROM spaces WHERE user_id = ?').all(userId);
    res.json({
      success: true,
      data: {
        userName: '杭州七七八八久久有限公司',
        loginAccount: req.user.phone,
        balance: account.balance,
        coupon: account.coupon,
        storageUsed: '539.1 M',
        storageTotal: '100G',
        retriealUsed: '123.3 M',
        retriealTotal: '100G',
        expiryDate: '2025-12-31',
        spaces: spaces.map(s => ({ name: s.name, type: s.type, status: s.status, apiKey: (s.api_key || '').substring(0, 6) + '****' })),
        enterpriseCode: db.prepare('SELECT enterprise_code FROM enterprise_disks WHERE user_id = ?').get(userId)?.enterprise_code || '',
      }
    });
  } else if (tab === 'ai') {
    const models = db.prepare('SELECT * FROM ai_models WHERE user_id = ?').all(userId);
    const totalCalls = models.reduce((s, m) => s + m.calls, 0);
    const running = models.filter(m => m.status === '运行中').length;
    const abnormal = models.filter(m => m.status === '异常').length;
    res.json({
      success: true,
      data: {
        userName: '杭州七七八八久久有限公司',
        loginAccount: req.user.phone,
        balance: db.prepare('SELECT balance FROM accounts WHERE user_id = ?').get(userId)?.balance || 0,
        coupon: db.prepare('SELECT coupon FROM accounts WHERE user_id = ?').get(userId)?.coupon || 0,
        deployedModels: `${models.length}/5`,
        runningModels: running,
        abnormalModels: abnormal,
        modelRevenue: models.reduce((s, m) => s + m.revenue, 0).toFixed(2),
        weeklyCalls: totalCalls,
        topModel: models.length > 0 ? models[0].name : '-',
        qpsPeak: 5775,
      }
    });
  } else if (tab === 'disk') {
    const disk = db.prepare('SELECT * FROM enterprise_disks WHERE user_id = ?').get(userId);
    res.json({
      success: true,
      data: {
        userName: '杭州七七八八久久有限公司',
        loginAccount: req.user.phone,
        enterpriseCode: disk?.enterprise_code || '',
        diskUsed: disk?.used_gb || 0,
        diskTotal: disk?.total_gb || 0,
        diskExpiry: disk?.expiry_date || '',
      }
    });
  } else {
    res.status(400).json({ success: false, message: '未知 tab' });
  }
});

// ─── 账单 API ─────────────────────────────────────────────
// GET /api/bills
app.get('/api/bills', verifyToken, (req, res) => {
  const userId = req.user.userId;
  // 模拟账单数据（实际应从数据库获取）
  const bills = [
    { orderId: 'ORD202505200001', service: '云存储', content: '标准存储 100GB · 月付', amount: 99.00, time: '2025-05-20', status: 'paid' },
    { orderId: 'ORD202505150002', service: 'AI推理', content: 'Token消耗 · 按量计费', amount: 456.69, time: '2025-05-15', status: 'paid' },
    { orderId: 'ORD202505100003', service: '数据存证', content: '存证服务 · 50次', amount: 200.00, time: '2025-05-10', status: 'paid' },
    { orderId: 'ORD202505050004', service: '云存储', content: '数据取回 100GB · 月付', amount: 49.00, time: '2025-05-05', status: 'paid' },
    { orderId: 'ORD202505010005', service: 'AI推理', content: '模型部署 · 月付', amount: 551.00, time: '2025-05-01', status: 'paid' },
    { orderId: 'ORD202504200007', service: '数据存证', content: '实时出证 · 20次', amount: 150.00, time: '2025-04-20', status: 'cancelled' },
  ];
  res.json({ success: true, data: { bills, total: 24, page: 1, pageSize: 10 } });
});

// ─── 套餐 API ─────────────────────────────────────────────
// GET /api/plans
app.get('/api/plans', verifyToken, (_req, res) => {
  const plans = [
    { name: '基础版', price: 99, unit: '月', storage: '50 GB', retrieval: '50 GB', tokenIn: '500K', tokenOut: '250K', models: 1 },
    { name: '专业版', price: 299, unit: '月', storage: '100 GB', retrieval: '100 GB', tokenIn: '1,000K', tokenOut: '500K', models: 5, current: true },
    { name: '企业版', price: 999, unit: '月', storage: '500 GB', retrieval: '500 GB', tokenIn: '5,000K', tokenOut: '2,500K', models: 20 },
    { name: '旗舰版', price: 2999, unit: '月', storage: '2 TB', retrieval: '2 TB', tokenIn: '50,000K', tokenOut: '25,000K', models: -1 },
  ];
  res.json({ success: true, data: { plans, current: '专业版' } });
});

// ─── 资源统计 API ─────────────────────────────────────────
// GET /api/resource-stats
app.get('/api/resource-stats', verifyToken, (_req, res) => {
  const stats = {
    storageUsed: '539.1 MB',
    retrievalUsed: '123.3 MB',
    aiModelsDeployed: '3/5',
    monthlyCost: 1355.69,
    balance: 355.69,
    costBreakdown: [
      { date: '10-1', storage: 30, retrieval: 25, ai: 20, deposit: 15 },
      { date: '10-7', storage: 35, retrieval: 30, ai: 22, deposit: 18 },
      { date: '10-31', storage: 25, retrieval: 20, ai: 15, deposit: 12 },
    ],
  };
  res.json({ success: true, data: stats });
});

// ─── 存储管理 API ─────────────────────────────────────────
// GET /api/storage
app.get('/api/storage', verifyToken, (_req, res) => {
  const data = {
    storage: {
      used: '539.1 M',
      total: '100G',
      expiryDate: '2027-05-20',
      weeklyUpload: '539.1 M',
      readCount: 3767,
    },
    retrieval: {
      used: '239.1 M',
      total: '100G',
      expiryDate: '2027-05-20',
      weeklyRetrieval: '44.8 M',
      readCount: 2213,
    },
    deposit: {
      balance: 2000.00,
      monthlySpent: 159.88,
      totalSpent: 159.88,
    },
    depositStats: {
      count: '12.6M',
      unitPrice: 0.03,
      weeklyCount: '0.8 M',
      monthlyCost: 200.00,
      verifyCount: 210,
    },
    realtimeProof: {
      totalCopies: 895,
      unitPrice: 2,
      weeklyCount: 57,
      monthlyCost: 200.00,
      downloadCount: 210,
    },
    officialCert: {
      totalCopies: 14,
      unitPrice: 1200,
      weeklyCount: 0,
      monthlyCost: 0.00,
      verifyCount: 32,
    },
  };
  res.json({ success: true, data });
});

// ─── 推理服务 API ─────────────────────────────────────────
// GET /api/inference
app.get('/api/inference', verifyToken, (_req, res) => {
  const data = {
    overviewStats: { deployed: '3/5', running: 1, abnormal: 1, cost: 1355.69 },
    secondaryStats: { weeklyCalls: 35190, qpsPeak: 5775, successRate: 99.8, avgResponse: 120 },
    apis: [
      { modelName: 'gemma-3:7b-it-q4_k_m', name: '推理接口-01', status: 'running', apiKey: 'sk-7e3c...05b85', createdAt: '2025-05-01', expiryAt: '2025-12-31' },
      { modelName: 'Model-NPU-6b', name: '推理接口-02', status: 'stopped', apiKey: 'sk-a1b2...c3d4e', createdAt: '2025-04-15', expiryAt: '2025-12-31' },
      { modelName: 'GLM-4.6', name: '推理接口-03', status: 'error', apiKey: 'sk-f5g6...h7i8j', createdAt: '2025-03-20', expiryAt: '2025-12-31' },
    ],
    qpsLimit: 1000,
  };
  res.json({ success: true, data });
});

// ─── 404 兜底 ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// ─── 启动 ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ HALOME 后端服务已启动：http://localhost:${PORT}`);
  console.log(`   环境：${process.env.NODE_ENV || 'development'}`);
  console.log(`   数据库：${path.join(__dirname, 'halome.db')}`);
});
