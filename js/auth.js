/**
 * HALOME 光宇开放平台 - 认证模块（前端）
 * 调用后端 API 完成短信验证码发送、登录/注册、Token 验证
 * 不再使用 localStorage 伪造认证
 */
(function () {
  'use strict';

  // ── 配置 ─────────────────────────────────────────────────
  var API_BASE = ''; // 同域部署（生产环境默认）
  // 本地开发时改为 'http://localhost:3000'

  var TOKEN_KEY = 'halome_token';

  // ── 工具函数 ─────────────────────────────────────────────

  function maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }

  // 计算相对于 login.html 的路径前缀
  // 根目录: ./    pages/: ../    pages/api-docs/: ../../
  function getBasePath() {
    var p = window.location.pathname;
    if (p.includes('/api-docs/')) return '../../';
    if (p.includes('/pages/')) return '../';
    return './';
  }

  // 带 Token 的 fetch 封装
  function authFetch(url, options) {
    options = options || {};
    options.headers = options.headers || {};
    var token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }
    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
    return fetch(url, options);
  }

  // ── 公开 API ────────────────────────────────────────────

  // 获取当前登录用户信息（从 Token 解析，不存敏感信息）
  window.getSession = function () {
    try {
      var token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      // 简单解析 JWT payload（不验证签名，仅读内容）
      var payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch (e) {
      return null;
    }
  };

  // 是否已登录（有 Token 且未过期）
  window.isLoggedIn = function () {
    var session = window.getSession();
    if (!session) return false;
    // 检查 exp
    if (session.exp && session.exp * 1000 < Date.now()) return false;
    return true;
  };

  // 发送短信验证码
  // 返回：Promise<{ success: boolean, message: string }>
  window.sendSmsCode = function (phone) {
    return fetch(API_BASE + '/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone })
    }).then(function (res) { return res.json(); });
  };

  // 手机号 + 验证码登录/注册
  // 返回：Promise<{ success: boolean, isNew: boolean, message: string, data?: { token: string } }>
  window.login = function (phone, code) {
    return fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone, code: code })
    })
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (result.success && result.data && result.data.token) {
        localStorage.setItem(TOKEN_KEY, result.data.token);
      }
      return result;
    });
  };

  // 登出：清除 Token，可选调用后端登出接口
  window.logout = function () {
    localStorage.removeItem(TOKEN_KEY);
    // 最佳实践中后端应把 Token 加入黑名单，此处仅前端清除
    fetch(API_BASE + '/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem(TOKEN_KEY) || '') }
    }).catch(function () { /* 忽略网络错误 */ });
    window.location.href = getBasePath() + 'login.html';
  };

  // 页面加载时检查登录状态（除 login.html 外）
  window.checkAuth = function () {
    if (window.location.pathname.endsWith('login.html')) {
      return;
    }
    if (!window.isLoggedIn()) {
      window.location.href = getBasePath() + 'login.html';
      return;
    }
    // 可选：调用后端验证 Token 是否仍然有效
    authFetch(API_BASE + '/api/auth/me')
      .then(function (res) {
        if (!res.ok) {
          localStorage.removeItem(TOKEN_KEY);
          window.location.href = getBasePath() + 'login.html';
        }
      })
      .catch(function () {
        // 网络错误时不跳转，允许离线浏览（按需调整）
      });
  };

  // 获取认证头（供其他模块调用 API 时使用）
  window.getAuthHeader = function () {
    var token = localStorage.getItem(TOKEN_KEY);
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  };

  // ── 初始化：绑定全站退出按钮 ──────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.header-btn[title="退出"]');
    if (btn) {
      btn.addEventListener('click', function () {
        window.logout();
      });
      btn.style.cursor = 'pointer';
    }
  });

})();
