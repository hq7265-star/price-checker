import { useState } from 'react';
import { api } from '../services/api';

export default function ColesSearchPage() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await api.searchColes(query);
      setProducts(data.products);
    } catch (err) {
      alert('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>Coles Price Checker</h2>
      <p className="page-desc">
        Search for a product to see its current price and any discounts on Coles.
      </p>

      <form className="coles-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="e.g. Ultralife Ginkgo 12000mg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search Coles'}
        </button>
      </form>

      {loading && <p className="status-msg">Searching Coles...</p>}

      {!loading && searched && products.length === 0 && (
        <p className="status-msg">No products found. Try a different search term.</p>
      )}

      {products.length > 0 && (
        <div className="coles-results">
          {products.map((p, i) => (
            <div key={i} className={`coles-card ${p.isOnSpecial ? 'on-special' : ''}`}>
              {p.imageUrl && (
                <img className="coles-img" src={p.imageUrl} alt={p.name} />
              )}
              <div className="coles-info">
                <div className="coles-brand">{p.brand}</div>
                <h3 className="coles-name">{p.name}</h3>
                <div className="coles-size">{p.size}</div>

                <div className="coles-pricing">
                  {p.price != null && (
                    <span className="coles-price">${p.price.toFixed(2)}</span>
                  )}
                  {p.wasPrice && (
                    <span className="coles-was">Was ${p.wasPrice.toFixed(2)}</span>
                  )}
                </div>

                {p.isOnSpecial && (
                  <div className="coles-special">
                    <span className="special-badge">{p.priceDescription || 'SPECIAL'}</span>
                    {p.saveStatement && (
                      <span className="save-text">{p.saveStatement}</span>
                    )}
                  </div>
                )}

                {p.isMultiBuy && p.offerDescription && (
                  <div className="coles-multibuy">{p.offerDescription}</div>
                )}

                {p.unitPrice && (
                  <div className="coles-unit">{p.unitPrice}</div>
                )}

                <a
                  className="coles-link"
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Coles
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
