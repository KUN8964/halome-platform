/**
 * 套餐 API
 * GET /api/plans
 */
const { verifyToken } = require('../middleware/auth');

function plansRoutes(app) {
  app.get('/api/plans', verifyToken, (_req, res) => {
    const plans = [
      { name: '基础版', price: 99, unit: '月', storage: '50 GB', retrieval: '50 GB', tokenIn: '500K', tokenOut: '250K', models: 1 },
      { name: '专业版', price: 299, unit: '月', storage: '100 GB', retrieval: '100 GB', tokenIn: '1,000K', tokenOut: '500K', models: 5, current: true },
      { name: '企业版', price: 999, unit: '月', storage: '500 GB', retrieval: '500 GB', tokenIn: '5,000K', tokenOut: '2,500K', models: 20 },
      { name: '旗舰版', price: 2999, unit: '月', storage: '2 TB', retrieval: '2 TB', tokenIn: '50,000K', tokenOut: '25,000K', models: -1 },
    ];
    res.json({ success: true, data: { plans, current: '专业版' } });
  });
}

module.exports = plansRoutes;
