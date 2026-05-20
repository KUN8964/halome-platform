// HALOME Sidebar Renderer
(function() {
  const navData = [
    { type: 'item', label: '价格计算器', page: 'price-calculator', icon: '💰' },
    {
      type: 'group',
      label: '控制台',
      page: 'console',
      expanded: true,
      children: [
        { label: '仪表盘', page: 'console-dashboard' },
        { label: '数据存储管理', page: 'console-storage' },
        { label: 'AI模型管理', page: 'console-ai-model' },
        { label: '推理服务', page: 'console-inference' },
        { label: '监控与日志', page: 'console-monitoring' },
      ]
    },
    {
      type: 'group',
      label: '资源中心',
      page: 'resource',
      children: [
        { label: 'API文档', page: 'api-docs' },
        { label: 'SDK下载', page: 'sdk-download' },
        { label: '代码示例', page: 'code-samples' },
        { label: '在线测试', page: 'online-test' },
      ]
    },
    {
      type: 'group',
      label: '账户中心',
      page: 'account',
      children: [
        { label: '账户信息', page: 'account-info' },
        { label: '资源用量', page: 'account-resource' },
        { label: '账单与发票', page: 'account-bills' },
        { label: '公告中心', page: 'account-announcements' },
      ]
    },
    { type: 'item', label: '企业云盘', page: 'enterprise-disk', icon: '☁️' },
  ];

  const currentPage = document.body.dataset.page || '';
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Auto-detect path level
  const isInPagesDir = window.location.pathname.includes('/pages/');
  const linkPrefix = isInPagesDir ? '' : 'pages/';

  let html = `
    <div class="sidebar-header">
      <a href="${isInPagesDir ? '../index.html' : 'index.html'}" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
        <div class="brand-logo">HALOME</div>
        <div style="color:var(--text-secondary);font-size:14px;">光宇</div>
        <div class="brand-badge">开放平台</div>
      </a>
    </div>
    <nav class="sidebar-nav">
  `;

  navData.forEach(item => {
    if (item.type === 'item') {
      const isActive = currentPage === item.page;
      const href = item.page === 'price-calculator'
        ? (isInPagesDir ? '../index.html' : 'index.html')
        : linkPrefix + item.page + '.html';
      html += `<a href="${href}" class="nav-item ${isActive ? 'active' : ''}">${item.label}</a>`;
    } else if (item.type === 'group') {
      const isGroupActive = currentPage.startsWith(item.page) || item.children.some(c => currentPage === c.page);
      html += `
        <div class="nav-group ${isGroupActive ? 'expanded' : ''}">
          <div class="nav-item group-header">
            <span>${item.label}</span>
            <span class="nav-arrow">▶</span>
          </div>
          <div class="nav-subitems">
      `;
      item.children.forEach(child => {
        const isActive = currentPage === child.page;
        html += `<a href="${linkPrefix}${child.page}.html" class="nav-subitem ${isActive ? 'active' : ''}">${child.label}</a>`;
      });
      html += `</div></div>`;
    }
  });

  html += `</nav>`;
  html += `
    <div class="sidebar-footer">
      <div>服务状态 · 开放平台协议 · 隐私政策</div>
      <div style="margin-top:4px;">浙ICP备2025184107号-1</div>
    </div>
  `;

  sidebar.innerHTML = html;

  // Bind expand/collapse on group headers (single handler, no inline onclick)
  sidebar.querySelectorAll('.nav-group > .group-header').forEach(header => {
    header.addEventListener('click', function(e) {
      // Don't toggle if clicking on a link inside
      if (e.target.tagName === 'A') return;
      const group = this.parentElement;
      group.classList.toggle('expanded');
    });
  });
})();
