import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <h1 className="nav-title">Discount Tracker</h1>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Deals
        </NavLink>
        <NavLink to="/coles" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Coles
        </NavLink>
        <NavLink to="/watchlist" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Watchlist
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Settings
        </NavLink>
      </div>
    </nav>
  );
}
