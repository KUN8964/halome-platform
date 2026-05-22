/**
 * 认证相关路由
 * - POST /api/sms/send
 * - POST /api/auth/login
 * - POST /api/auth/logout
 * - GET /api/auth/me
 */
const { db, stmts } = require('../db');
const { generateSmsCode, signToken } = require('../utils/token');
const { verifyToken } = require('../middleware/auth');

function authRoutes(app) {
  // ─── 发送短信验证码 ──────────────────────────────────────
  app.post('/api/sms/send', (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: '手机号格式不正确' });
    }

    const code = generateSmsCode();
    const now = Math.floor(Date.now() / 1000);

    const recent = stmts.recentCode.get(phone, now - 60);
    if (recent) {
      return res.status(429).json({ success: false, message: '请稍后再试（60秒间隔）' });
    }

    stmts.insertCode.run(phone, code);

    console.log(`[DEV] 短信验证码 phone=${phone} code=${code}`);

    res.json({
      success: true,
      message: '验证码已发送',
      ...(process.env.NODE_ENV !== 'production' ? { dev_code: code } : {}),
    });
  });

  // ─── 手机号 + 验证码登录 / 注册 ─────────────────────────
  app.post('/api/auth/login', (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: '手机号和验证码不能为空' });
    }

    const record = stmts.findCode.get(phone);
    if (!record || record.code !== code || record.used) {
      return res.status(400).json({ success: false, message: '验证码错误或已过期' });
    }

    stmts.markCodeUsed.run(phone, code);

    let user = stmts.findUser.get(phone);
    const isNew = !user;
    const now = Math.floor(Date.now() / 1000);

    if (isNew) {
      stmts.insertUser.run(phone, now);
      user = stmts.findUser.get(phone);
    } else {
      stmts.updateLogin.run(now, phone);
    }

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

  // ─── 登出 ───────────────────────────────────────────────
  app.post('/api/auth/logout', (_req, res) => {
    res.json({ success: true, message: '已登出' });
  });

  // ─── 获取当前登录用户信息 ──────────────────────────────
  app.get('/api/auth/me', verifyToken, (req, res) => {
    const user = stmts.findUser.get(req.user.phone);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({
      success: true,
      data: {
        phone: user.phone,
        companyName: user.company_name || null,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      },
    });
  });
}

module.exports = authRoutes;
