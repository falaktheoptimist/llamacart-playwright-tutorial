import { products } from './data/products.js';

export function renderProductDetail(id) {
  const p = products.find(p => p.id === id);
  if (!p) return;
  document.getElementById('product-detail-content').innerHTML = `
    <button class="back-btn" onclick="history.back(); navigate('shop')" data-testid="back-to-shop">← Back to shop</button>
    <div class="product-detail-card">
      <div class="product-detail-emoji">${p.emoji}</div>
      <div>
        <h1 data-testid="detail-product-name">${p.name}</h1>
        <div class="detail-price" data-testid="detail-product-price">$${p.price.toFixed(2)}</div>
        <p class="detail-desc">${p.description}</p>
        <div class="tags">${p.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>
        <p style="font-size:.9rem;color:var(--text-muted);margin-bottom:1rem;">⭐ ${p.rating} · ${p.reviews} reviews</p>
        <button class="add-to-cart-btn" data-testid="detail-add-to-cart" onclick="addToCart(${p.id})" ${!p.inStock ? 'disabled' : ''}>
          ${p.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>`;
}
