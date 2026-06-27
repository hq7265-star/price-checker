import { useState, useEffect } from 'react';
import { api } from '../services/api';
import WatchlistForm from '../components/WatchlistForm';

export default function WatchlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const data = await api.getWatchlist();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(item) {
    try {
      const newItem = await api.addWatchlistItem(item);
      setItems([newItem, ...items]);
    } catch (err) {
      alert('Failed to add: ' + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteWatchlistItem(id);
      setItems(items.filter((i) => i.id !== id));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  async function handleToggle(item) {
    try {
      const updated = await api.updateWatchlistItem(item.id, {
        is_active: item.is_active ? 0 : 1,
      });
      setItems(items.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  }

  return (
    <div className="page">
      <h2>My Watchlist</h2>
      <p className="page-desc">Add keywords for products you want to track. You'll get an email when matching deals appear.</p>

      <WatchlistForm onAdd={handleAdd} />

      {loading ? (
        <p className="status-msg">Loading...</p>
      ) : items.length === 0 ? (
        <p className="status-msg">No items yet. Add a keyword above!</p>
      ) : (
        <div className="watchlist-items">
          {items.map((item) => (
            <div key={item.id} className={`watchlist-card ${item.is_active ? '' : 'inactive'}`}>
              <div className="watchlist-info">
                <strong>{item.keyword}</strong>
                {item.target_price && (
                  <span className="target-price">under ${item.target_price.toFixed(2)}</span>
                )}
                {item.category && (
                  <span className="watchlist-category">{item.category}</span>
                )}
              </div>
              <div className="watchlist-actions">
                <button
                  className="btn-small"
                  onClick={() => handleToggle(item)}
                >
                  {item.is_active ? 'Pause' : 'Resume'}
                </button>
                <button
                  className="btn-small btn-danger"
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
