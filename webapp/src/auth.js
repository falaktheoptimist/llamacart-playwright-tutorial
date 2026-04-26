import { DEMO_USER } from './data/products.js';
import { state } from './state.js';
import { showToast } from './toast.js';

export function renderAuthNav() {
  const el = document.getElementById('auth-nav');
  if (state.user) {
    el.innerHTML = `<button class="user-avatar" data-testid="user-avatar" onclick="handleLogout()" title="Sign out">${state.user.name.slice(0, 2).toUpperCase()}</button>`;
  } else {
    el.innerHTML = `<button class="btn btn-primary" onclick="navigate('login')" data-testid="nav-login">Sign In</button>`;
  }
}

export function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  if (email === DEMO_USER.email && password === DEMO_USER.password) {
    state.user = { email, name: DEMO_USER.name };
    localStorage.setItem('llama-user', JSON.stringify(state.user));
    errEl.classList.remove('visible');
    renderAuthNav();
    showToast('Welcome back, ' + state.user.name + '! 🦙', 'success');
    window.navigate('shop');
  } else {
    errEl.classList.add('visible');
  }
}

export function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('reg-error');
  if (!name || !email || !password) { errEl.textContent = 'All fields are required.'; errEl.classList.add('visible'); return; }
  if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; errEl.classList.add('visible'); return; }
  errEl.classList.remove('visible');
  state.user = { email, name };
  localStorage.setItem('llama-user', JSON.stringify(state.user));
  renderAuthNav();
  showToast('Account created! Welcome, ' + name + ' 🦙', 'success');
  window.navigate('shop');
}

export function handleLogout() {
  state.user = null;
  localStorage.removeItem('llama-user');
  renderAuthNav();
  showToast('Signed out. See you soon! 🦙');
  window.navigate('home');
}
