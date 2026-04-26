import { products } from './data/products.js';
import { state } from './state.js';
import { showToast } from './toast.js';

export function saveCart() {
  localStorage.setItem('llama-cart', JSON.stringify(state.cart));
  const total = state.cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cart-count');
  el.textContent = total;
  el.dataset.count = total;
}

export function addToCart(id) {
  const p = products.find(p => p.id === id);
  if (!p || !p.inStock) return;
  const existing = state.cart.find(i => i.id === id);
  if (existing) existing.qty++;
  else state.cart.push({ id, qty: 1 });
  saveCart();
  showToast(`${p.emoji} ${p.name} added to cart!`, 'success');
}

export function updateQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

export function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

export function renderCart() {
  const el = document.getElementById('cart-content');
  if (!state.cart.length) {
    el.innerHTML = `<div class="cart-empty"><div class="empty-emoji">🦙</div><p>Your cart is empty!</p><button class="btn btn-primary" onclick="navigate('shop')" style="margin-top:1rem" data-testid="empty-cart-shop-btn">Start Shopping</button></div>`;
    return;
  }
  const subtotal = state.cart.reduce((s, i) => {
    const p = products.find(p => p.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;

  el.innerHTML = state.cart.map(item => {
    const p = products.find(p => p.id === item.id);
    return `
      <div class="cart-item" data-testid="cart-item" data-product-id="${p.id}">
        <span class="cart-item-emoji">${p.emoji}</span>
        <div class="cart-item-info">
          <div class="cart-item-name" data-testid="cart-item-name">${p.name}</div>
          <div class="cart-item-price" data-testid="cart-item-price">$${(p.price * item.qty).toFixed(2)}</div>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateQty(${p.id}, -1)" data-testid="qty-decrease" aria-label="Decrease quantity">−</button>
          <span class="qty-value" data-testid="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty(${p.id}, 1)" data-testid="qty-increase" aria-label="Increase quantity">+</button>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${p.id})" data-testid="remove-from-cart" aria-label="Remove item">✕</button>
      </div>`;
  }).join('') + `
    <div class="cart-summary">
      <div class="summary-row"><span>Subtotal</span><span data-testid="cart-subtotal">$${subtotal.toFixed(2)}</span></div>
      <div class="summary-row"><span>Shipping</span><span data-testid="cart-shipping">${shipping === 0 ? 'Free 🎉' : '$' + shipping.toFixed(2)}</span></div>
      <div class="summary-row summary-total"><span>Total</span><span data-testid="cart-total">$${total.toFixed(2)}</span></div>
      <button class="checkout-btn" onclick="handleCheckout()" data-testid="checkout-btn">Checkout →</button>
    </div>`;
}

export function handleCheckout() {
  state.cart = [];
  saveCart();
  window.navigate('order-success');
}
