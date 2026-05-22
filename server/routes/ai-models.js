/**
 * AI 模型管理 API
 * GET /api/ai-models
 */
const { verifyToken } = require('../middleware/auth');

function aiModelsRoutes(app) {
  app.get('/api/ai-models', verifyToken, (_req, res) => {
    const data = {
      overviewStats: {
        deployed: '3/5',
        running: 1,
        abnormal: 1,
        revenue: 977355.69,
        distribution: [
          { name: 'Labels', color: '#6366f1', value: 30 },
          { name: 'Labels', color: '#3b82f6', value: 25 },
          { name: 'Labels', color: '#10b981', value: 20 },
          { name: 'Labels', color: '#8b5cf6', value: 15 },
          { name: 'Labels', color: '#06b6d4', value: 7 },
          { name: 'Labels', color: '#f59e0b', value: 3 },
        ],
      },
      secondaryStats: {
        weeklyCalls: '35,190 次',
        topModel: 'Model-X',
        qpsPeak: '5,775',
        apiCount: '9',
      },
      models: [
        { name: 'Model-X', status: 'running', revenue: 2100.50, calls: 12500, createdAt: '2025-05-01' },
        { name: 'Model-NPU-6b', status: 'stopped', revenue: 1567.29, calls: 8920, createdAt: '2025-04-15' },
        { name: 'GLM-4.6', status: 'error', revenue: 869.20, calls: 13770, createdAt: '2025-03-20' },
      ],
      usage: { balance: 355.69, monthlyCost: 1355.69, bill: 1500, cert: 0 },
    };
    res.json({ success: true, data });
  });
}

module.exports = aiModelsRoutes;
