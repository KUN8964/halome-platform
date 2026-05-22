/**
 * 存储管理 API
 * GET /api/storage
 */
const { verifyToken } = require('../middleware/auth');

function storageRoutes(app) {
  app.get('/api/storage', verifyToken, (_req, res) => {
    const data = {
      storage: {
        used: '539.1 M',
        total: '100G',
        expiryDate: '2027-05-20',
        weeklyUpload: '539.1 M',
        readCount: 3767,
      },
      retrieval: {
        used: '239.1 M',
        total: '100G',
        expiryDate: '2027-05-20',
        weeklyRetrieval: '44.8 M',
        readCount: 2213,
      },
      deposit: {
        balance: 2000.00,
        monthlySpent: 159.88,
        totalSpent: 159.88,
      },
      depositStats: {
        count: '12.6M',
        unitPrice: 0.03,
        weeklyCount: '0.8 M',
        monthlyCost: 200.00,
        verifyCount: 210,
      },
      realtimeProof: {
        totalCopies: 895,
        unitPrice: 2,
        weeklyCount: 57,
        monthlyCost: 200.00,
        downloadCount: 210,
      },
      officialCert: {
        totalCopies: 14,
        unitPrice: 1200,
        weeklyCount: 0,
        monthlyCost: 0.00,
        verifyCount: 32,
      },
    };
    res.json({ success: true, data });
  });
}

module.exports = storageRoutes;
