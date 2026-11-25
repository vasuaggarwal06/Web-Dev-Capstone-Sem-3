import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, errorText } from '../utils/api.js';
import Alert from '../components/Alert.jsx';

const emptyForm = { name: '', email: '', password: '', role: 'teacher', rollNumber: '' };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api.get('/users');
      setUsers(d.users);
    } catch (err) { setError(errorText(err)); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const payload = { ...form };
      if (!payload.rollNumber) delete payload.rollNumber;
      await api.post('/users', payload);
      setForm(emptyForm);
      setSuccess('User created');
      load();
    } catch (err) { setError(errorText(err)); }
  };

  const changeRole = async (id, role) => {
    setError(''); setSuccess('');
    try {
      await api.patch(`/users/${id}/role`, { role });
      setSuccess('Role updated');
      load();
    } catch (err) { setError(errorText(err)); }
  };

  return (
    <>
      <h1>User management</h1>
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Roll no.</th><th>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.rollNumber || '—'}</td>
                <td>
                  <select value={u.role} disabled={u._id === me._id} onChange={(e) => changeRole(u._id, e.target.value)}>
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Create user</h2>
        <form onSubmit={create} className="form-grid">
          <label>Name<input name="name" value={form.name} onChange={handleChange} required /></label>
          <label>Email<input type="email" name="email" value={form.email} onChange={handleChange} required /></label>
          <label>Password<input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} /></label>
          <label>Role
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="teacher">teacher</option>
              <option value="student">student</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label>Roll number (students)<input name="rollNumber" value={form.rollNumber} onChange={handleChange} /></label>
          <button className="btn">Create user</button>
        </form>
      </div>
    </>
  );
}
