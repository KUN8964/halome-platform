/**
 * 集成测试：auth 路由
 * POST /api/sms/send、POST /api/auth/login、GET /api/auth/me
 *
 * 使用独立测试数据库，通过 vitest pool: forks 隔离
 */

// ⚠️ 必须在所有 require 之前设置 DB 路径
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, '..', 'test-halome.db');
process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret-for-integration';
process.env.NODE_ENV = 'test';

// 删除旧测试数据库
try { fs.unlinkSync(testDbPath); } catch (e) { /* ok */ }

const request = require('supertest');
const express = require('express');

// 现在才加载路由（会使用 test DB_PATH）
const app = express();
app.use(express.json());
require('../routes/auth')(app);

afterAll(() => {
  try { fs.unlinkSync(testDbPath); } catch (e) { /* ok */ }
});

describe('POST /api/sms/send', () => {
  it('合法手机号应返回 success', async () => {
    const res = await request(app)
      .post('/api/sms/send')
      .send({ phone: '13800138000' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('验证码已发送');
    expect(res.body.dev_code).toBeDefined();
  });

  it('非法手机号应返回 400', async () => {
    const res = await request(app)
      .post('/api/sms/send')
      .send({ phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('60秒内重复发送应返回 429', async () => {
    await request(app).post('/api/sms/send').send({ phone: '13800138001' });
    const res = await request(app)
      .post('/api/sms/send')
      .send({ phone: '13800138001' });
    expect(res.status).toBe(429);
  });
});

describe('POST /api/auth/login', () => {
  it('正确验证码应登录成功', async () => {
    const smsRes = await request(app)
      .post('/api/sms/send')
      .send({ phone: '13800138002' });
    const code = smsRes.body.dev_code;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: '13800138002', code });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.phone).toBe('13800138002');
  });

  it('首次登录 isNew 应为 true', async () => {
    const smsRes = await request(app)
      .post('/api/sms/send')
      .send({ phone: '13800138003' });
    const code = smsRes.body.dev_code;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: '13800138003', code });
    expect(res.body.isNew).toBe(true);
  });

  it('错误验证码应返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: '13800138002', code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  it('有效 Token 应返回用户信息', async () => {
    const smsRes = await request(app)
      .post('/api/sms/send')
      .send({ phone: '13800138004' });
    const code = smsRes.body.dev_code;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: '13800138004', code });
    const token = loginRes.body.data.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe('13800138004');
  });

  it('无 Token 应返回 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
