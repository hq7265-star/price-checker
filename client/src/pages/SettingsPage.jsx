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
        <p>To enable email notifications, you need to configure Gmail SMTP in the server's <code>.env</code> file:</p>
        <ol>
          <li>Enable 2-Factor Authentication on your Google account</li>
          <li>Go to <strong>Google Account &gt; Security &gt; App Passwords</strong></li>
          <li>Create an App Password for "Mail"</li>
          <li>Add <code>EMAIL_USER</code> and <code>EMAIL_PASS</code> to the <code>.env</code> file</li>
        </ol>
      </div>
    </div>
  );
}
