import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import EventForm from "./pages/EventForm";
import MyTickets from "./pages/MyTickets";
import CheckIn from "./pages/CheckIn";
import Reports from "./pages/Reports";
import Users from "./pages/Users";

// Greeting on the left, today's date on the right
function TopBar({ user }) {
  const today = new Date();
  const weekday = today.toLocaleDateString("en-PH", { weekday: "long" });
  const rest = today.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

  return (
    <header className="topbar">
      <div>
        <div className="topbar-main">
          <strong>Hi, {user.name}</strong>
        </div>
        <div className="topbar-sub">{user.role} · MSEUF Events</div>
      </div>
      <div className="topbar-right">
        <div className="topbar-main">
          <strong>{weekday},</strong> {rest}
        </div>
        <div className="topbar-sub">today is</div>
      </div>
    </header>
  );
}

// Only logged-in users can see these pages (inside the app shell).
// Pass `roles` to limit a page to certain roles.
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return (
    <div className="shell-wrap">
      <div className="shell">
        <Navbar />
        <main className="shell-main">
          <TopBar user={user} />
          <div className="page">{children}</div>
        </main>
      </div>
    </div>
  );
}

// Logged-in users get redirected away from login/register
function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading...</p>;
  return user ? <Navigate to="/" replace /> : children;
}

const MANAGERS = ["admin", "organizer"];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/" element={<ProtectedRoute><Events /></ProtectedRoute>} />
      <Route path="/events/new" element={<ProtectedRoute roles={MANAGERS}><EventForm /></ProtectedRoute>} />
      <Route path="/events/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
      <Route path="/events/:id/edit" element={<ProtectedRoute roles={MANAGERS}><EventForm /></ProtectedRoute>} />
      <Route path="/my-tickets" element={<ProtectedRoute roles={["student"]}><MyTickets /></ProtectedRoute>} />
      <Route path="/check-in" element={<ProtectedRoute roles={MANAGERS}><CheckIn /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={MANAGERS}><Reports /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={["admin"]}><Users /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
