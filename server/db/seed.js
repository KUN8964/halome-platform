/**
 * 数据库 Seed 脚本 — 初始化演示数据
 * 使用方式：node db/seed.js
 *
 * 该脚本一次性插入演示数据，不在 API 请求中产生副作用。
 */
require('dotenv').config();
const { db, stmts } = require('./index');

console.log('🌱 开始初始化演示数据...');

// ─── 演示用户 ──────────────────────────────────────────────
const demoPhone = '13700001111';
const now = Math.floor(Date.now() / 1000);

const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(demoPhone);
let userId;

if (existing) {
  userId = existing.id;
  console.log(`  用户已存在：${demoPhone} (id=${userId})，跳过创建`);
} else {
  const result = db.prepare('INSERT INTO users (phone, company_name, created_at) VALUES (?, ?, ?)').run(demoPhone, '杭州七七八八久久有限公司', now);
  userId = result.lastInsertRowid;
  console.log(`  创建演示用户：${demoPhone} (id=${userId})`);
}

// ─── 账户 ─────────────────────────────────────────────────
stmts.ensureAccount.run(userId, 1000, 500);
console.log('  账户余额：¥1,000 + 抵扣券 ¥500');

// ─── 云空间 ───────────────────────────────────────────────
stmts.ensureSpace.run(userId, '测试空间', '标准存储', '使用中', 'ak-demo-****');
console.log('  云空间：测试空间（标准存储）');

// ─── AI 模型 ──────────────────────────────────────────────
stmts.ensureModel.run(userId, 'Model-X', '运行中', 4536.99, 35190);
stmts.ensureModel.run(userId, 'Model-NPU-6b', '已停止', 1567.29, 8920);
stmts.ensureModel.run(userId, 'GLM-4.6', '异常', 869.20, 13770);
console.log('  AI 模型：Model-X, Model-NPU-6b, GLM-4.6');

// ─── 企业云盘 ─────────────────────────────────────────────
stmts.ensureDisk.run(userId, 'QSCG', 0, 0, '2027-05-20');
console.log('  企业云盘：企业码 QSCG');

console.log('✅ 演示数据初始化完成！');
