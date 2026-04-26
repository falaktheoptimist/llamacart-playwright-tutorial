export function showToast(msg, type = '') {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.dataset.testid = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
