import { useState, useEffect } from 'react';
import { api } from '../services/api';
import DealCard from '../components/DealCard';

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    loadDeals();
  }, [category]);

  async function loadDeals() {
    setLoading(true);
    try {
      const data = await api.getDeals(category);
      setDeals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim()) {
      loadDeals();
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchDeals(search);
      setDeals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchNow() {
    setFetching(true);
    try {
      const result = await api.fetchNow();
      alert(`Fetched ${result.count} new deals`);
      loadDeals();
    } catch (err) {
      alert('Failed to fetch: ' + err.message);
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Latest Deals</h2>
        <button className="btn-secondary" onClick={handleFetchNow} disabled={fetching}>
          {fetching ? 'Fetching...' : 'Refresh Deals'}
        </button>
      </div>

      <div className="filters">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          <option value="groceries">Groceries</option>
          <option value="health-beauty">Health & Beauty</option>
        </select>
      </div>

      {loading ? (
        <p className="status-msg">Loading deals...</p>
      ) : deals.length === 0 ? (
        <p className="status-msg">No deals found. Try refreshing!</p>
      ) : (
        <div className="deals-list">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
