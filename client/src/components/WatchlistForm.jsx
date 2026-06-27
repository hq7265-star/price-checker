import { useState } from 'react';

export default function WatchlistForm({ onAdd }) {
  const [keyword, setKeyword] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [category, setCategory] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!keyword.trim()) return;

    onAdd({
      keyword: keyword.trim(),
      target_price: targetPrice ? parseFloat(targetPrice) : null,
      category: category || null,
    });

    setKeyword('');
    setTargetPrice('');
    setCategory('');
  }

  return (
    <form className="watchlist-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Keyword (e.g. CeraVe, Finish)"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Max price (optional)"
        value={targetPrice}
        onChange={(e) => setTargetPrice(e.target.value)}
        min="0"
        step="0.01"
      />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Any category</option>
        <option value="groceries">Groceries</option>
        <option value="health-beauty">Health & Beauty</option>
      </select>
      <button type="submit">Add to Watchlist</button>
    </form>
  );
}
