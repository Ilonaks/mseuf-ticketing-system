import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <span className="brand">MSEUF Events</span>

      <div className="nav-links">
        <NavLink to="/" end>
          Events
        </NavLink>

        {user.role === "student" && <NavLink to="/my-tickets">My Tickets</NavLink>}

        <span className="user-name">
          {user.name} ({user.role})
        </span>

        <button className="btn-small" onClick={logout}>
          Log out
        </button>
      </div>
    </nav>
  );
}