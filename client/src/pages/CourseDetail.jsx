import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api, errorText } from '../utils/api.js';
import Alert from '../components/Alert.jsx';

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isStaff = user.role === 'teacher' || user.role === 'admin';
  const [course, setCourse] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/courses/${id}`);
      setCourse(data.course);
      if (isStaff) {
        const s = await api.get('/users/students');
        setAllStudents(s.users);
      }
    } catch (err) {
      setError(errorText(err));
    }
  }, [id, isStaff]);

  useEffect(() => { load(); }, [load]);

  const toggle = (sid) =>
    setSelected((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));

  const enroll = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const data = await api.post(`/courses/${id}/enroll`, { studentIds: selected });
      setCourse(data.course);
      setSelected([]);
      setSuccess('Students enrolled');
    } catch (err) {
      setError(errorText(err));
    }
  };

  const unenroll = async (sid) => {
    setError(''); setSuccess('');
    try {
      const data = await api.delete(`/courses/${id}/enroll/${sid}`);
      setCourse(data.course);
    } catch (err) {
      setError(errorText(err));
    }
  };

  if (!course) return <><Alert>{error}</Alert><p className="muted">Loading…</p></>;

  const enrolledIds = new Set(course.students.map((s) => s._id));
  const available = allStudents.filter((s) => !enrolledIds.has(s._id));

  return (
    <>
      <h1>{course.code} – {course.name}</h1>
      <p className="muted">Class: {course.className} · Teacher: {course.teacher?.name} · Required attendance: {course.requiredPercentage}%</p>
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      {isStaff && <p><Link className="btn" to={`/courses/${id}/attendance`}>Mark / edit attendance</Link></p>}

      <div className="card">
        <h2>Enrolled students ({course.students.length})</h2>
        <table>
          <thead><tr><th>Roll no.</th><th>Name</th><th>Email</th><th /></tr></thead>
          <tbody>
            {course.students.map((s) => (
              <tr key={s._id}>
                <td>{s.rollNumber || '—'}</td><td>{s.name}</td><td>{s.email}</td>
                <td>{isStaff && <button className="btn btn-danger btn-sm" onClick={() => unenroll(s._id)}>Remove</button>}</td>
              </tr>
            ))}
            {course.students.length === 0 && <tr><td colSpan="4" className="muted">No students enrolled.</td></tr>}
          </tbody>
        </table>
      </div>

      {isStaff && (
        <div className="card">
          <h2>Enrol students</h2>
          {available.length === 0 ? <p className="muted">All registered students are already enrolled.</p> : (
            <form onSubmit={enroll}>
              <div className="checklist">
                {available.map((s) => (
                  <label key={s._id} className="check">
                    <input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggle(s._id)} />
                    {s.name} <span className="muted">({s.rollNumber || s.email})</span>
                  </label>
                ))}
              </div>
              <button className="btn" disabled={selected.length === 0}>Enrol {selected.length || ''} selected</button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
