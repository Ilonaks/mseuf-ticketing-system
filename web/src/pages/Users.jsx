import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { errorMessage } from "../utils/format";
import usePolling from "../hooks/usePolling";

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { confirm, toast } = useDialog();

  const loadUsers = async ({ background = false } = {}) => {
    try {
      const res = await api.get("/users", { params: { role: role || undefined, search: search || undefined } });
      setUsers(res.data);
    } catch (err) {
      if (!background) toast(errorMessage(err, "Could not load users."), "error");
    } finally {
      setLoading(false);
    }
  };

  // Reload when the filters change (search waits until typing pauses)
  useEffect(() => {
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, search]);

  usePolling(() => loadUsers({ background: true }));

  const changeRole = async (target, newRole) => {
    const effects = {
      admin: "Admins can manage every event and every user account.",
      organizer: "Organizers can create events and check in tickets for their own events.",
      student: "Students can only view events and reserve tickets.",
    };
    const ok = await confirm({
      title: `Make ${target.name} ${newRole === "admin" ? "an" : "a"} ${newRole}?`,
      message: `${effects[newRole]} They are currently ${target.role === "admin" ? "an" : "a"} ${target.role}.`,
      confirmText: `Make ${newRole}`,
      tone: newRole === "admin" ? "danger" : "primary",
    });
    if (!ok) return;
    try {
      const res = await api.patch(`/users/${target.id}/role`, { role: newRole });
      toast(res.data.message);
      await loadUsers();
    } catch (err) {
      toast(errorMessage(err, "Could not change the role."), "error");
    }
  };

  return (
    <>
      <h2 className="page-title">Manage Users</h2>


      <div className="filters">
        <input placeholder="Search name, email, or student ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="organizer">Organizers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? (
        <p className="center">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="muted">No users found.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Student ID</th>
                <th>Tickets</th>
                <th>Events</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.student_id ?? "—"}</td>
                  <td>{u.tickets_count}</td>
                  <td>{u.events_count}</td>
                  <td>
                    {u.id === me.id ? (
                      <span>{u.role} (you)</span>
                    ) : (
                      <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                        <option value="student">student</option>
                        <option value="organizer">organizer</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
