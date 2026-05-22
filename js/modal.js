/**
 * 全局模态框工具函数
 * 所有页面通过 <script src="js/modal.js"> 加载
 *
 * showModal(id)   — 显示指定 ID 的模态框
 * closeModal(id)  — 关闭指定 ID 的模态框，并自动清除表单错误
 */
function showModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) {
    el.style.display = 'none';
    // 清除表单错误提示（所有页面通用）
    el.querySelectorAll('.form-error').forEach(function (e) {
      e.classList.remove('show');
    });
  }
}
