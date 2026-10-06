import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="auth-page">
      <div className="card">
        <h1>Welcome, {user.name}!</h1>
        <p className="muted">Role: {user.role}</p>
        <button onClick={logout}>Log out</button>
      </div>
    </div>
  );
}