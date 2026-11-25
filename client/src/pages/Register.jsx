import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorText } from '../utils/api.js';
import Alert from '../components/Alert.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', rollNumber: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setBusy(true);
    try {
      const { confirm, ...payload } = form;
      if (!payload.rollNumber) delete payload.rollNumber;
      await register(payload);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card auth-card">
      <h1>Create student account</h1>
      <Alert>{error}</Alert>
      <form onSubmit={handleSubmit}>
        <label>Full name
          <input name="name" value={form.name} onChange={handleChange} required minLength={2} />
        </label>
        <label>Email
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>Roll number (optional)
          <input name="rollNumber" value={form.rollNumber} onChange={handleChange} />
        </label>
        <label>Password
          <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} />
        </label>
        <label>Confirm password
          <input type="password" name="confirm" value={form.confirm} onChange={handleChange} required minLength={6} />
        </label>
        <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
      </form>
      <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
      <p className="muted small">Teacher and admin accounts are created by an administrator.</p>
    </div>
  );
}
