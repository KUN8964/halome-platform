/**
 * JWT Token 工具
 */
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function generateSmsCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = { signToken, generateSmsCode };
