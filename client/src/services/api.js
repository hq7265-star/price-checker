const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getDeals: (category) => request(`/deals${category ? `?category=${category}` : ''}`),
  searchDeals: (q) => request(`/deals/search?q=${encodeURIComponent(q)}`),
  fetchNow: () => request('/deals/fetch-now', { method: 'POST' }),

  getWatchlist: () => request('/watchlist'),
  addWatchlistItem: (item) => request('/watchlist', { method: 'POST', body: JSON.stringify(item) }),
  updateWatchlistItem: (id, item) => request(`/watchlist/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
  deleteWatchlistItem: (id) => request(`/watchlist/${id}`, { method: 'DELETE' }),

  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  searchColes: (q) => request(`/coles/search?q=${encodeURIComponent(q)}`),
};
