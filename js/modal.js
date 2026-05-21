/**
 * 全局模态框工具函数
 * 所有页面通过 <script src="js/modal.js"> 加载
 */
function showModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) {
    el.style.display = 'none';
    // 清除表单错误提示
    el.querySelectorAll('.form-error').forEach(function(e) { e.classList.remove('show'); });
  }
}
