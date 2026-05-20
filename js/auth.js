/**
 * HALOME 光宇开放平台 - 认证模块
 * 纯前端 localStorage 模拟后端
 * 测试验证码：123456
 */
(function () {
  'use strict';

  var SESSION_KEY = 'halome_session';
  var USERS_KEY = 'halome_users';
  var DEMO_CODE = '123456';

  // ── 内部工具 ──────────────────────

  function maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }

  // ── 公开 API ──────────────────────

  window.getSession = function () {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  window.isLoggedIn = function () {
    return !!window.getSession();
  };

  window.getUsers = function () {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  window.isRegistered = function (phone) {
    var users = window.getUsers();
    return users.indexOf(phone) !== -1;
  };

  window.registerUser = function (phone) {
    var users = window.getUsers();
    if (users.indexOf(phone) === -1) {
      users.push(phone);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return true; // 新注册
    }
    return false; // 已存在
  };

  window.login = function (phone, code) {
    // 校验验证码
    if (code !== DEMO_CODE) {
      return { success: false, message: '验证码错误，请重新输入' };
    }

    // 检查是否为新用户
    var isNew = window.registerUser(phone);

    // 写入会话
    var session = {
      phone: phone,
      loginAt: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return {
      success: true,
      isNew: isNew,
      message: isNew ? '注册成功，欢迎加入 HALOME' : '登录成功，欢迎回来'
    };
  };

  window.logout = function () {
    localStorage.removeItem(SESSION_KEY);
    // 跳转到登录页（统一用 login.html）
    var base = window.location.pathname.includes('/pages/') ? '../' : './';
    window.location.href = base + 'login.html';
  };

  window.checkAuth = function () {
    // 如果当前就是登录页，不需要检查
    if (window.location.pathname.endsWith('login.html')) {
      return;
    }
    if (!window.isLoggedIn()) {
      var base = window.location.pathname.includes('/pages/') ? '../' : './';
      window.location.href = base + 'login.html';
    }
  };

  // ── 初始化：绑定全站退出按钮 ──────

  document.addEventListener('DOMContentLoaded', function () {
    // 绑定 top-header 的退出按钮
    var btn = document.querySelector('.header-btn[title="退出"]');
    if (btn) {
      btn.addEventListener('click', function () {
        window.logout();
      });
      btn.style.cursor = 'pointer';
    }
  });

})();
