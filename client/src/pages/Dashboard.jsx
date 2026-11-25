import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api, errorText } from '../utils/api.js';
import Alert from '../components/Alert.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [shortageCount, setShortageCount] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const c = await api.get('/courses');
        setCourses(c.courses);
        if (user.role === 'student') {
          const s = await api.get('/attendance/me/summary');
          setAlerts(s.alerts);
        } else {
          const s = await api.get('/attendance/shortage');
          setShortageCount(s.count);
        }
      } catch (err) {
        setError(errorText(err));
      }
    };
    load();
  }, [user.role]);

  return (
    <>
      <h1>Welcome, {user.name}</h1>
      <Alert>{error}</Alert>

      {user.role === 'student' && alerts.length > 0 && (
        <div className="alert alert-warn">
          <strong>Attendance shortage!</strong> You are below the required percentage in:
          <ul>
            {alerts.map((a) => (
              <li key={a.courseId}>{a.courseCode} – {a.courseName}: <strong>{a.percentage}%</strong> (required {a.requiredPercentage}%)</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid">
        <div className="card stat"><span className="stat-num">{courses.length}</span><span>{user.role === 'student' ? 'Enrolled courses' : 'Courses'}</span></div>
        {shortageCount !== null && (
          <div className="card stat"><span className={`stat-num ${shortageCount ? 'text-danger' : ''}`}>{shortageCount}</span><span>Students in shortage</span></div>
        )}
        {user.role === 'student' && (
          <div className="card stat"><span className={`stat-num ${alerts.length ? 'text-danger' : 'text-ok'}`}>{alerts.length}</span><span>Subjects below requirement</span></div>
        )}
      </div>

      <div className="card">
        <h2>Your courses</h2>
        {courses.length === 0 ? <p className="muted">No courses yet.</p> : (
          <ul className="plain">
            {courses.map((c) => (
              <li key={c._id}><Link to={`/courses/${c._id}`}>{c.code} – {c.name}</Link> <span className="muted">({c.className})</span></li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
