import { renderFeatured, renderShop, setCategory, handleSearch } from './shop.js';
import { renderCart, addToCart, updateQty, removeFromCart, handleCheckout, saveCart } from './cart.js';
import { renderAuthNav, handleLogin, handleRegister, handleLogout } from './auth.js';
import { renderProductDetail } from './productDetail.js';
import { showToast } from './toast.js';

window.navigate = function(page, data) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  window.scrollTo(0, 0);
  if (page === 'shop') renderShop();
  if (page === 'home') renderFeatured();
  if (page === 'cart') renderCart();
  if (page === 'product' && data) renderProductDetail(data);
};

window.setCategory = setCategory;
window.handleSearch = handleSearch;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.removeFromCart = removeFromCart;
window.handleCheckout = handleCheckout;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.showToast = showToast;

renderFeatured();
renderAuthNav();
saveCart();
