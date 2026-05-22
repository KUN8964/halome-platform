/**
 * 测试：utils/token.js
 * 覆盖 signToken、generateSmsCode
 * 全局 vitest：describe, it, expect
 */
const { signToken, generateSmsCode } = require('../utils/token');

describe('generateSmsCode', () => {
  it('应生成 6 位数字验证码', () => {
    const code = generateSmsCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('应生成 100000-999999 之间的数字', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateSmsCode();
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });
});

describe('signToken', () => {
  it('应生成有效的 JWT Token', () => {
    const payload = { userId: 1, phone: '13800138000' };
    const token = signToken(payload);
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('不同 payload 应生成不同 Token', () => {
    const token1 = signToken({ userId: 1, phone: '13800138000' });
    const token2 = signToken({ userId: 2, phone: '13900139000' });
    expect(token1).not.toBe(token2);
  });
});
