import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import MarkAttendance from './pages/MarkAttendance.jsx';
import MyAttendance from './pages/MyAttendance.jsx';
import ShortageList from './pages/ShortageList.jsx';
import Users from './pages/Users.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* any logged-in user */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
          </Route>

          {/* student only */}
          <Route element={<ProtectedRoute roles={['student']} />}>
            <Route path="/my-attendance" element={<MyAttendance />} />
          </Route>

          {/* teacher + admin */}
          <Route element={<ProtectedRoute roles={['teacher', 'admin']} />}>
            <Route path="/courses/:id/attendance" element={<MarkAttendance />} />
            <Route path="/shortage" element={<ShortageList />} />
          </Route>

          {/* admin only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/users" element={<Users />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
