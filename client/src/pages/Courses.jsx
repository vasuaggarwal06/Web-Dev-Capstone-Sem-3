import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api, errorText } from '../utils/api.js';
import Alert from '../components/Alert.jsx';

const emptyForm = { code: '', name: '', className: '', requiredPercentage: 75, teacher: '' };

export default function Courses() {
  const { user } = useAuth();
  const canCreate = user.role === 'teacher' || user.role === 'admin';
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get('/courses');
      setCourses(data.courses);
      if (user.role === 'admin') {
        const t = await api.get('/users?role=teacher');
        setTeachers(t.users);
      }
    } catch (err) {
      setError(errorText(err));
    }
  }, [user.role]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const payload = { ...form, requiredPercentage: Number(form.requiredPercentage) };
      if (user.role !== 'admin') delete payload.teacher;
      await api.post('/courses', payload);
      setForm(emptyForm);
      setSuccess('Course created');
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course and all its attendance records?')) return;
    try {
      await api.delete(`/courses/${id}`);
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <>
      <h1>Courses</h1>
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="card">
        <table>
          <thead>
            <tr><th>Code</th><th>Name</th><th>Class</th><th>Teacher</th><th>Students</th><th>Required %</th><th /></tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c._id}>
                <td><Link to={`/courses/${c._id}`}>{c.code}</Link></td>
                <td>{c.name}</td>
                <td>{c.className}</td>
                <td>{c.teacher?.name}</td>
                <td>{c.students.length}</td>
                <td>{c.requiredPercentage}%</td>
                <td>{user.role === 'admin' && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c._id)}>Delete</button>}</td>
              </tr>
            ))}
            {courses.length === 0 && <tr><td colSpan="7" className="muted">No courses found.</td></tr>}
          </tbody>
        </table>
      </div>

      {canCreate && (
        <div className="card">
          <h2>Add course</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>Code<input name="code" value={form.code} onChange={handleChange} required placeholder="CS301" /></label>
            <label>Name<input name="name" value={form.name} onChange={handleChange} required placeholder="Database Systems" /></label>
            <label>Class / section<input name="className" value={form.className} onChange={handleChange} required placeholder="CSE - Sem 5 - A" /></label>
            <label>Required %<input type="number" min="0" max="100" name="requiredPercentage" value={form.requiredPercentage} onChange={handleChange} required /></label>
            {user.role === 'admin' && (
              <label>Teacher
                <select name="teacher" value={form.teacher} onChange={handleChange} required>
                  <option value="">Select teacher…</option>
                  {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </label>
            )}
            <button className="btn">Create course</button>
          </form>
        </div>
      )}
    </>
  );
}
