/**
 * 账单 API
 * GET /api/bills
 */
const { verifyToken } = require('../middleware/auth');

function billsRoutes(app) {
  app.get('/api/bills', verifyToken, (_req, res) => {
    const bills = [
      { orderId: 'ORD202505200001', service: '云存储', content: '标准存储 100GB · 月付', amount: 99.00, time: '2025-05-20', status: 'paid' },
      { orderId: 'ORD202505150002', service: 'AI推理', content: 'Token消耗 · 按量计费', amount: 456.69, time: '2025-05-15', status: 'paid' },
      { orderId: 'ORD202505100003', service: '数据存证', content: '存证服务 · 50次', amount: 200.00, time: '2025-05-10', status: 'paid' },
      { orderId: 'ORD202505050004', service: '云存储', content: '数据取回 100GB · 月付', amount: 49.00, time: '2025-05-05', status: 'paid' },
      { orderId: 'ORD202505010005', service: 'AI推理', content: '模型部署 · 月付', amount: 551.00, time: '2025-05-01', status: 'paid' },
      { orderId: 'ORD202504200007', service: '数据存证', content: '实时出证 · 20次', amount: 150.00, time: '2025-04-20', status: 'cancelled' },
    ];
    res.json({ success: true, data: { bills, total: 24, page: 1, pageSize: 10 } });
  });
}

module.exports = billsRoutes;
