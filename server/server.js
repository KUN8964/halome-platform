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
