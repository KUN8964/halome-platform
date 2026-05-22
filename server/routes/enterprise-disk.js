/**
 * 企业云盘 API
 * GET /api/enterprise-disk
 */
const { verifyToken } = require('../middleware/auth');

function enterpriseDiskRoutes(app) {
  app.get('/api/enterprise-disk', verifyToken, (_req, res) => {
    const data = {
      authStatus: 'authed',
      stats: [
        {
          title: '存储使用情况',
          value: '539.1 MB',
          total: '100 GB',
          percent: 0.5,
          expireDate: '2025年12月31日',
          color: 'var(--accent-purple)',
        },
        {
          title: '取回统计',
          value: '123.3 MB',
          total: '100 GB',
          percent: 0.1,
          expireDate: '2025年12月31日',
          color: 'var(--accent-blue)',
        },
        {
          title: 'Token输入量',
          value: '456,780',
          total: '1,000,000',
          percent: 45.6,
          expireDate: '2025年12月31日',
          color: 'var(--accent-blue)',
        },
        {
          title: 'Token输出量',
          value: '234,560',
          total: '500,000',
          percent: 46.9,
          expireDate: '2025年12月31日',
          color: 'var(--accent-green)',
        },
      ],
      enterprise: {
        code: 'QSCG',
        name: '杭州七七八八久久有限公司',
        memberCount: 12,
      },
    };
    res.json({ success: true, data });
  });
}

module.exports = enterpriseDiskRoutes;
