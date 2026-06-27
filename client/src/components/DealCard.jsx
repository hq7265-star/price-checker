export default function DealCard({ deal }) {
  return (
    <div className="deal-card">
      <div className="deal-header">
        {deal.price && (
          <span className="deal-price">${deal.price.toFixed(2)}</span>
        )}
        {deal.original_price && (
          <span className="deal-original">${deal.original_price.toFixed(2)}</span>
        )}
        <span className="deal-source">{deal.source}</span>
      </div>
      <h3 className="deal-title">
        <a href={deal.link} target="_blank" rel="noopener noreferrer">
          {deal.title}
        </a>
      </h3>
      {deal.description && (
        <p className="deal-desc">{deal.description.slice(0, 150)}{deal.description.length > 150 ? '...' : ''}</p>
      )}
      <div className="deal-footer">
        <span className="deal-category">{deal.category}</span>
        {deal.published_at && (
          <span className="deal-date">{new Date(deal.published_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
