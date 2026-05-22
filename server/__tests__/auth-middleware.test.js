/**
 * 测试：middleware/auth.js - verifyToken 中间件
 * 全局 vitest：describe, it, expect, beforeEach
 */
const { verifyToken } = require('../middleware/auth');
const { signToken } = require('../utils/token');

describe('verifyToken', () => {
  let req, res, next;

  beforeEach(() => {
    res = {
      status: function (code) {
        this._status = code;
        return { json: (data) => { this._body = data; return this; } };
      },
      _status: null,
      _body: null,
    };
    next = () => { req._nextCalled = true; };
  });

  it('无 Authorization 头应返回 401', () => {
    req = { headers: {} };
    verifyToken(req, res, next);
    expect(res._status).toBe(401);
    expect(res._body.message).toContain('未登录');
  });

  it('Authorization 头格式错误应返回 401', () => {
    req = { headers: { authorization: 'InvalidFormat' } };
    verifyToken(req, res, next);
    expect(res._status).toBe(401);
  });

  it('有效 Token 应调用 next() 并设置 req.user', () => {
    const token = signToken({ userId: 1, phone: '13800138000' });
    req = { headers: { authorization: `Bearer ${token}` } };
    verifyToken(req, res, next);
    expect(req._nextCalled).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe(1);
    expect(req.user.phone).toBe('13800138000');
  });

  it('篡改的 Token 应返回 401', () => {
    req = { headers: { authorization: 'Bearer fake.invalid.token' } };
    verifyToken(req, res, next);
    expect(res._status).toBe(401);
  });
});
