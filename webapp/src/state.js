export const state = {
  cart: JSON.parse(localStorage.getItem('llama-cart') || '[]'),
  user: JSON.parse(localStorage.getItem('llama-user') || 'null'),
  activeCategory: 'all',
  searchQuery: '',
};
