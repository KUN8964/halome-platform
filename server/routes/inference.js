/**
 * 推理服务 API
 * GET /api/inference
 */
const { verifyToken } = require('../middleware/auth');

function inferenceRoutes(app) {
  app.get('/api/inference', verifyToken, (_req, res) => {
    const data = {
      overviewStats: { deployed: '3/5', running: 1, abnormal: 1, cost: 1355.69 },
      secondaryStats: { weeklyCalls: 35190, qpsPeak: 5775, successRate: 99.8, avgResponse: 120 },
      apis: [
        { modelName: 'gemma-3:7b-it-q4_k_m', name: '推理接口-01', status: 'running', apiKey: 'sk-7e3c...05b85', createdAt: '2025-05-01', expiryAt: '2025-12-31' },
        { modelName: 'Model-NPU-6b', name: '推理接口-02', status: 'stopped', apiKey: 'sk-a1b2...c3d4e', createdAt: '2025-04-15', expiryAt: '2025-12-31' },
        { modelName: 'GLM-4.6', name: '推理接口-03', status: 'error', apiKey: 'sk-f5g6...h7i8j', createdAt: '2025-03-20', expiryAt: '2025-12-31' },
      ],
      qpsLimit: 1000,
    };
    res.json({ success: true, data });
  });
}

module.exports = inferenceRoutes;
