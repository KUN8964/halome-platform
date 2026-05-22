/**
 * 仪表盘数据 API
 * GET /api/dashboard?tab=cloud|ai|disk
 */
const { db } = require('../db');
const { verifyToken } = require('../middleware/auth');

function dashboardRoutes(app) {
  app.get('/api/dashboard', verifyToken, (req, res) => {
    const { tab = 'cloud' } = req.query;
    const userId = req.user.userId;

    if (tab === 'cloud') {
      const account = db.prepare('SELECT * FROM accounts WHERE user_id = ?').get(userId) || { balance: 0, coupon: 0 };
      const spaces = db.prepare('SELECT * FROM spaces WHERE user_id = ?').all(userId);
      const user = db.prepare('SELECT company_name FROM users WHERE id = ?').get(userId);
      res.json({
        success: true,
        data: {
          userName: user?.company_name || '未设置企业名称',
          loginAccount: req.user.phone,
          balance: account.balance,
          coupon: account.coupon,
          storageUsed: '539.1 M',
          storageTotal: '100G',
          retrievalUsed: '123.3 M',
          retrievalTotal: '100G',
          expiryDate: '2025-12-31',
          spaces: spaces.map(s => ({
            name: s.name,
            type: s.type,
            status: s.status,
            apiKey: (s.api_key || '').substring(0, 6) + '****',
          })),
          enterpriseCode: (
            db.prepare('SELECT enterprise_code FROM enterprise_disks WHERE user_id = ?').get(userId)
            || {}
          ).enterprise_code || '',
        },
      });
    } else if (tab === 'ai') {
      const models = db.prepare('SELECT * FROM ai_models WHERE user_id = ?').all(userId);
      const totalCalls = models.reduce((s, m) => s + m.calls, 0);
      const running = models.filter(m => m.status === '运行中').length;
      const abnormal = models.filter(m => m.status === '异常').length;
      const user = db.prepare('SELECT company_name FROM users WHERE id = ?').get(userId);
      const account = db.prepare('SELECT balance, coupon FROM accounts WHERE user_id = ?').get(userId) || { balance: 0, coupon: 0 };
      res.json({
        success: true,
        data: {
          userName: user?.company_name || '未设置企业名称',
          loginAccount: req.user.phone,
          balance: account.balance,
          coupon: account.coupon,
          deployedModels: `${models.length}/5`,
          runningModels: running,
          abnormalModels: abnormal,
          modelRevenue: models.reduce((s, m) => s + m.revenue, 0).toFixed(2),
          weeklyCalls: totalCalls,
          topModel: models.length > 0 ? models[0].name : '-',
          qpsPeak: 5775,
        },
      });
    } else if (tab === 'disk') {
      const disk = db.prepare('SELECT * FROM enterprise_disks WHERE user_id = ?').get(userId);
      const user = db.prepare('SELECT company_name FROM users WHERE id = ?').get(userId);
      res.json({
        success: true,
        data: {
          userName: user?.company_name || '未设置企业名称',
          loginAccount: req.user.phone,
          enterpriseCode: disk?.enterprise_code || '',
          diskUsed: disk?.used_gb || 0,
          diskTotal: disk?.total_gb || 0,
          diskExpiry: disk?.expiry_date || '',
        },
      });
    } else {
      res.status(400).json({ success: false, message: '未知 tab' });
    }
  });
}

module.exports = dashboardRoutes;
