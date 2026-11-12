import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { CalendarIcon, ChartIcon, LogoutIcon, ScanIcon, TicketIcon, UsersIcon } from "./Icons";

// Left icon sidebar (labels show as tooltips and on small screens)
export default function Navbar() {
  const { user, logout } = useAuth();
  const { confirm, toast } = useDialog();

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Log out?",
      message: "You'll need to log in again to see your events and tickets.",
      confirmText: "Log out",
      tone: "danger",
    });
    if (!ok) return;
    await logout();
    toast("You've been logged out.");
  };
  const isManager = user.role === "admin" || user.role === "organizer";

  const links = [
    { to: "/", label: "Events", icon: CalendarIcon, end: true, show: true },
    { to: "/my-tickets", label: "My Tickets", icon: TicketIcon, show: user.role === "student" },
    { to: "/check-in", label: "Check In", icon: ScanIcon, show: isManager },
    { to: "/reports", label: "Dashboard", icon: ChartIcon, show: isManager },
    { to: "/users", label: "Users", icon: UsersIcon, show: user.role === "admin" },
  ].filter((l) => l.show);

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="logo" title="MSEUF Events">M</div>

      <nav className="side-links">
        {links.map(({ to, label, icon: IconCmp, end }) => (
          <NavLink key={to} to={to} end={end} className="side-link" title={label}>
            <IconCmp />
            <span className="side-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="side-bottom">
        <div className="avatar" title={`${user.name} (${user.role})`}>{initials}</div>
        <button className="side-link side-logout" onClick={handleLogout} title="Log out">
          <LogoutIcon />
          <span className="side-label">Log out</span>
        </button>
      </div>
    </aside>
  );
}
