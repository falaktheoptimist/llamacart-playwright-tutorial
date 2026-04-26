import { products, categories } from './data/products.js';
import { state } from './state.js';

function productCardHTML(p, testid = 'product-card') {
  const oos = !p.inStock;
  return `
    <div class="product-card ${oos ? 'out-of-stock' : ''}" data-testid="${testid}" data-product-id="${p.id}" onclick="navigate('product', ${p.id})">
      <div class="product-emoji">${p.emoji}</div>
      <div class="product-body">
        <div class="product-name" data-testid="product-name">${p.name}</div>
        <div class="product-desc">${p.description}</div>
        <div class="product-footer">
          <span class="product-price" data-testid="product-price">$${p.price.toFixed(2)}</span>
          ${oos ? '<span class="out-of-stock-badge">Out of stock</span>' : `<span class="product-rating">⭐ ${p.rating} (${p.reviews})</span>`}
        </div>
        <button class="add-to-cart-btn" data-testid="add-to-cart" onclick="event.stopPropagation(); addToCart(${p.id})" ${oos ? 'disabled' : ''}>
          ${oos ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>`;
}

export function renderFeatured() {
  const featured = products.filter(p => p.inStock).slice(0, 4);
  document.getElementById('featured-grid').innerHTML = featured.map(p => productCardHTML(p, 'featured-card')).join('');
}

export function renderShop() {
  const filterEl = document.getElementById('filter-buttons');
  filterEl.innerHTML = categories.map(cat => `
    <button class="filter-btn ${cat === state.activeCategory ? 'active' : ''}" data-testid="filter-${cat}" onclick="setCategory('${cat}')">
      ${cat.charAt(0).toUpperCase() + cat.slice(1)}
    </button>`).join('');

  let filtered = products;
  if (state.activeCategory !== 'all') filtered = filtered.filter(p => p.category === state.activeCategory);
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q))
    );
  }

  document.getElementById('shop-heading').textContent =
    state.activeCategory === 'all' ? 'All Products' : state.activeCategory.charAt(0).toUpperCase() + state.activeCategory.slice(1);
  document.getElementById('product-count').textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;
  document.getElementById('products-grid').innerHTML =
    filtered.length ? filtered.map(p => productCardHTML(p)).join('') :
    '<p style="color:var(--text-muted);padding:2rem 0;">No products found.</p>';
}

export function setCategory(cat) {
  state.activeCategory = cat;
  renderShop();
}

export function handleSearch(val) {
  state.searchQuery = val;
  if (document.getElementById('page-shop').classList.contains('active')) renderShop();
  else window.navigate('shop');
}
