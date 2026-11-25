import { useEffect, useState } from 'react';
import { api, errorText } from '../utils/api.js';
import Alert from '../components/Alert.jsx';
import PercentBar from '../components/PercentBar.jsx';

export default function MyAttendance() {
  const [summary, setSummary] = useState([]);
  const [records, setRecords] = useState([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const s = await api.get('/attendance/me/summary');
        setSummary(s.summary);
      } catch (err) { setError(errorText(err)); }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const q = courseFilter ? `?courseId=${courseFilter}` : '';
        const r = await api.get(`/attendance/me/records${q}`);
        setRecords(r.records);
      } catch (err) { setError(errorText(err)); }
    };
    load();
  }, [courseFilter]);

  const shortage = summary.filter((s) => s.shortage);

  return (
    <>
      <h1>My attendance</h1>
      <Alert>{error}</Alert>

      {shortage.length > 0 && (
        <div className="alert alert-warn">
          <strong>Shortage alert:</strong> your attendance is below the required level in {shortage.map((s) => s.courseCode).join(', ')}.
        </div>
      )}

      <div className="card">
        <h2>Percentage by subject</h2>
        <table>
          <thead><tr><th>Subject</th><th>Attended / Total</th><th>Attendance</th><th>Status</th></tr></thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.courseId}>
                <td>{s.courseCode} – {s.courseName}</td>
                <td>{s.attended} / {s.totalClasses}</td>
                <td><PercentBar value={s.percentage} required={s.requiredPercentage} /></td>
                <td>{s.shortage ? <span className="badge badge-danger">Shortage</span> : <span className="badge badge-ok">OK</span>}</td>
              </tr>
            ))}
            {summary.length === 0 && <tr><td colSpan="4" className="muted">No attendance recorded yet.</td></tr>}
          </tbody>
        </table>
        <p className="muted small">Present and late count as attended. Excused days are not counted.</p>
      </div>

      <div className="card">
        <div className="toolbar">
          <h2>Day-by-day</h2>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="">All subjects</option>
            {summary.map((s) => <option key={s.courseId} value={s.courseId}>{s.courseCode}</option>)}
          </select>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Subject</th><th>Status</th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r._id}>
                <td>{new Date(r.date).toISOString().slice(0, 10)}</td>
                <td>{r.course?.code}</td>
                <td><span className={`pill pill-${r.status} active`}>{r.status}</span></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan="3" className="muted">Nothing to show.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
