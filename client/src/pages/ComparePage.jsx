import { useState } from 'react';
import { api } from '../services/api';

const RETAILER_COLORS = {
  coles: '#e01a22',
  woolworths: '#125f2a',
  chemistwarehouse: '#e31837',
  priceline: '#e91e8c',
  myer: '#000000',
  davidjones: '#1a1a2e',
};

export default function ComparePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [progress, setProgress] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setResults([]);
    setProgress('Searching 6 retailers...');

    try {
      const data = await api.compareSearch(query);
      setResults(data.retailers || []);
    } catch (err) {
      alert('Search failed: ' + err.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  const totalProducts = results.reduce((sum, r) => sum + r.products.length, 0);
  const retailersWithResults = results.filter((r) => r.products.length > 0);

  return (
    <div className="page">
      <h2>Price Compare</h2>
      <p className="page-desc">
        Search across Coles, Woolworths, Chemist Warehouse, Priceline, Myer & David Jones. The cheapest is highlighted.
      </p>

      <form className="compare-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="e.g. Ultralife Ginkgo 12000mg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Compare Prices'}
        </button>
      </form>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{progress}</p>
          <p className="loading-hint">This takes ~15-30 seconds (checking 6 websites)</p>
        </div>
      )}

      {!loading && searched && totalProducts === 0 && (
        <p className="status-msg">No products found across any retailer. Try a different search.</p>
      )}

      {!loading && retailersWithResults.length > 0 && (
        <div className="compare-results">
          {results.map((retailer) => (
            <div key={retailer.retailer} className="retailer-section">
              <div className="retailer-header" style={{ borderColor: RETAILER_COLORS[retailer.retailer] || '#666' }}>
                <h3 style={{ color: RETAILER_COLORS[retailer.retailer] || '#333' }}>
                  {retailer.label}
                </h3>
                <span className="result-count">
                  {retailer.products.length} result{retailer.products.length !== 1 ? 's' : ''}
                </span>
              </div>

              {retailer.products.length === 0 ? (
                <p className="no-results">No results found</p>
              ) : (
                <div className="retailer-products">
                  {retailer.products.slice(0, 5).map((p, i) => (
                    <div
                      key={i}
                      className={`compare-card ${p.isCheapest ? 'cheapest' : ''} ${p.isOnSpecial ? 'on-special' : ''}`}
                    >
                      {p.isCheapest && <div className="cheapest-badge">CHEAPEST</div>}

                      <div className="compare-card-body">
                        {p.imageUrl && (
                          <img className="compare-img" src={p.imageUrl} alt={p.name} />
                        )}
                        <div className="compare-info">
                          {p.brand && <div className="compare-brand">{p.brand}</div>}
                          <div className="compare-name">{p.name}</div>
                          {p.size && <div className="compare-size">{p.size}</div>}

                          <div className="compare-pricing">
                            <span className={`compare-price ${p.isCheapest ? 'cheapest-price' : ''}`}>
                              ${p.price.toFixed(2)}
                            </span>
                            {p.wasPrice && (
                              <span className="compare-was">Was ${p.wasPrice.toFixed(2)}</span>
                            )}
                          </div>

                          {p.isOnSpecial && p.priceDescription && (
                            <span className="compare-special">{p.priceDescription}</span>
                          )}

                          {p.offerDescription && (
                            <span className="compare-offer">{p.offerDescription}</span>
                          )}

                          {p.unitPrice && (
                            <div className="compare-unit">{p.unitPrice}</div>
                          )}

                          {p.link && (
                            <a className="compare-link" href={p.link} target="_blank" rel="noopener noreferrer">
                              View on {retailer.label}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
