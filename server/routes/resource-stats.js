/**
 * 资源统计 API
 * GET /api/resource-stats
 */
const { verifyToken } = require('../middleware/auth');

function resourceStatsRoutes(app) {
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
}

module.exports = resourceStatsRoutes;
