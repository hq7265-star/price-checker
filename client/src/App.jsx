import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import DealsPage from './pages/DealsPage';
import WatchlistPage from './pages/WatchlistPage';
import SettingsPage from './pages/SettingsPage';
import ColesSearchPage from './pages/ColesSearchPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main">
          <Routes>
            <Route path="/" element={<DealsPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/coles" element={<ColesSearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
