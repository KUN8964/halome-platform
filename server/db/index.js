/**
 * HALOME 数据库初始化 + Prepared Statements
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'halome.db');
const db = new Database(DB_PATH);

// ─── 表结构初始化 ───────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    company_name TEXT,
    password_hash TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    last_login_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS sms_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    used INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

  CREATE TABLE IF NOT EXISTS accounts (
    user_id INTEGER PRIMARY KEY,
    balance REAL DEFAULT 0,
    coupon REAL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT '标准存储',
    status TEXT DEFAULT '使用中',
    api_key TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ai_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT '运行中',
    revenue REAL DEFAULT 0,
    calls INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS enterprise_disks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    enterprise_code TEXT,
    used_gb REAL DEFAULT 0,
    total_gb REAL DEFAULT 0,
    expiry_date TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ─── Prepared Statements ────────────────────────────────────

// SMS
const stmtInsertCode = db.prepare(
  'INSERT INTO sms_codes (phone, code) VALUES (?, ?)'
);
const stmtFindCode = db.prepare(
  'SELECT code, used FROM sms_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1'
);
const stmtMarkCodeUsed = db.prepare(
  'UPDATE sms_codes SET used = 1 WHERE phone = ? AND code = ?'
);
const stmtRecentCode = db.prepare(
  'SELECT id FROM sms_codes WHERE phone = ? AND created_at > ? AND used = 0'
);

// Users
const stmtFindUser = db.prepare('SELECT * FROM users WHERE phone = ?');
const stmtInsertUser = db.prepare(
  'INSERT INTO users (phone, created_at) VALUES (?, ?)'
);
const stmtUpdateLogin = db.prepare(
  'UPDATE users SET last_login_at = ? WHERE phone = ?'
);

// Accounts
const stmtEnsureAccount = db.prepare(
  'INSERT OR IGNORE INTO accounts (user_id, balance, coupon) VALUES (?, ?, ?)'
);

// Spaces
const stmtEnsureSpace = db.prepare(
  'INSERT OR IGNORE INTO spaces (user_id, name, type, status, api_key) VALUES (?, ?, ?, ?, ?)'
);

// AI Models
const stmtEnsureModel = db.prepare(
  'INSERT OR IGNORE INTO ai_models (user_id, name, status, revenue, calls) VALUES (?, ?, ?, ?, ?)'
);

// Enterprise Disks
const stmtEnsureDisk = db.prepare(
  'INSERT OR IGNORE INTO enterprise_disks (user_id, enterprise_code, used_gb, total_gb, expiry_date) VALUES (?, ?, ?, ?, ?)'
);

module.exports = {
  db,
  stmts: {
    insertCode: stmtInsertCode,
    findCode: stmtFindCode,
    markCodeUsed: stmtMarkCodeUsed,
    recentCode: stmtRecentCode,
    findUser: stmtFindUser,
    insertUser: stmtInsertUser,
    updateLogin: stmtUpdateLogin,
    ensureAccount: stmtEnsureAccount,
    ensureSpace: stmtEnsureSpace,
    ensureModel: stmtEnsureModel,
    ensureDisk: stmtEnsureDisk,
  },
};
