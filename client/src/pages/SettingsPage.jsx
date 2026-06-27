import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSettings().then((data) => {
      setEmail(data.notification_email || '');
      setLoading(false);
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    try {
      await api.updateSettings({ notification_email: email });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  }

  if (loading) return <p className="status-msg">Loading...</p>;

  return (
    <div className="page">
      <h2>Settings</h2>
      <p className="page-desc">Set your email to receive deal notifications.</p>

      <form className="settings-form" onSubmit={handleSave}>
        <label>
          Notification Email
          <input
            type="email"
            placeholder="your-email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit">Save</button>
        {saved && <span className="save-confirmation">Saved!</span>}
      </form>

      <div className="settings-info">
        <h3>Email Setup Guide</h3>
        <p>Email notifications are sent via <a href="https://resend.com" target="_blank" rel="noopener noreferrer">Resend</a> through Supabase Edge Functions.</p>
        <ol>
          <li>Create a free account at <strong>resend.com</strong></li>
          <li>Get your API key from the Resend dashboard</li>
          <li>In your Supabase project, go to <strong>Edge Functions &gt; Secrets</strong></li>
          <li>Add a secret: <code>RESEND_API_KEY</code> = your Resend API key</li>
        </ol>
      </div>
    </div>
  );
}
