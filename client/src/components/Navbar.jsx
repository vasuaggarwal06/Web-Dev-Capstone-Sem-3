import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const isStaff = user.role === 'teacher' || user.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="brand">AttendTrack</div>
      <nav>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/courses">Courses</NavLink>
        {user.role === 'student' && <NavLink to="/my-attendance">My Attendance</NavLink>}
        {isStaff && <NavLink to="/shortage">Shortage List</NavLink>}
        {user.role === 'admin' && <NavLink to="/users">Users</NavLink>}
      </nav>
      <div className="user-box">
        <span>{user.name} <span className={`badge role-${user.role}`}>{user.role}</span></span>
        <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
