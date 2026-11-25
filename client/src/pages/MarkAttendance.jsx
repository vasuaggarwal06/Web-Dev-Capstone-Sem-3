import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorText } from '../utils/api.js';
import Alert from '../components/Alert.jsx';

const STATUSES = ['present', 'absent', 'late', 'excused'];
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function MarkAttendance() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [statuses, setStatuses] = useState({});   // studentId -> status
  const [existing, setExisting] = useState({});   // studentId -> saved record (if any)
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const loadDay = useCallback(async (courseData, day) => {
    const data = await api.get(`/attendance/course/${id}?date=${day}`);
    const byStudent = {};
    data.records.forEach((r) => { byStudent[r.student._id] = r; });
    setExisting(byStudent);
    const initial = {};
    courseData.students.forEach((s) => { initial[s._id] = byStudent[s._id]?.status || 'present'; });
    setStatuses(initial);
  }, [id]);

  useEffect(() => {
    const init = async () => {
      try {
        const c = await api.get(`/courses/${id}`);
        setCourse(c.course);
      } catch (err) { setError(errorText(err)); }
    };
    init();
  }, [id]);

  useEffect(() => {
    if (!course) return;
    setHistory(null); setSuccess(''); setError('');
    loadDay(course, date).catch((err) => setError(errorText(err)));
  }, [course, date, loadDay]);

  const setAll = (status) => {
    const next = {};
    course.students.forEach((s) => { next[s._id] = status; });
    setStatuses(next);
  };

  const hasExisting = Object.keys(existing).length > 0;
  const changedExisting = Object.entries(statuses).some(([sid, st]) => existing[sid] && existing[sid].status !== st);

  const save = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (changedExisting && !reason.trim()) { setError('Please give a reason for changing already-saved attendance'); return; }
    setBusy(true);
    try {
      const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }));
      const res = await api.post('/attendance/bulk', { courseId: id, date, records, reason: reason.trim() || undefined });
      setSuccess(`${res.message}: ${res.inserted} new, ${res.modified} updated`);
      setReason('');
      await loadDay(course, date);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const showHistory = async (recordId) => {
    try {
      const data = await api.get(`/attendance/${recordId}/history`);
      setHistory(data);
    } catch (err) { setError(errorText(err)); }
  };

  if (!course) return <><Alert>{error}</Alert><p className="muted">Loading…</p></>;

  return (
    <>
      <p><Link to={`/courses/${id}`}>← {course.code}</Link></p>
      <h1>Attendance – {course.name}</h1>
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <form onSubmit={save} className="card">
        <div className="toolbar">
          <label>Date
            <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll('present')}>All present</button>{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll('absent')}>All absent</button>
          </div>
        </div>
        {hasExisting && <p className="muted small">Attendance for this date is already saved. Changes are recorded in the audit trail.</p>}

        <table>
          <thead><tr><th>Roll no.</th><th>Student</th><th>Status</th><th /></tr></thead>
          <tbody>
            {course.students.map((s) => (
              <tr key={s._id}>
                <td>{s.rollNumber || '—'}</td>
                <td>{s.name}</td>
                <td>
                  <div className="radio-row">
                    {STATUSES.map((st) => (
                      <label key={st} className={`pill pill-${st} ${statuses[s._id] === st ? 'active' : ''}`}>
                        <input type="radio" name={`st-${s._id}`} value={st} checked={statuses[s._id] === st}
                          onChange={() => setStatuses({ ...statuses, [s._id]: st })} />
                        {st}
                      </label>
                    ))}
                  </div>
                </td>
                <td>
                  {existing[s._id]?.history?.length > 0 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => showHistory(existing[s._id]._id)}>
                      History ({existing[s._id].history.length})
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {course.students.length === 0 && <tr><td colSpan="4" className="muted">Enrol students first.</td></tr>}
          </tbody>
        </table>

        {changedExisting && (
          <label>Reason for edit (required)
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. Marked wrongly, student was present" />
          </label>
        )}
        <button className="btn" disabled={busy || course.students.length === 0}>{busy ? 'Saving…' : 'Save attendance'}</button>
      </form>

      {history && (
        <div className="card">
          <h2>Audit trail – {history.student.name} ({new Date(history.date).toISOString().slice(0, 10)})</h2>
          <p className="muted">Current status: <strong>{history.currentStatus}</strong></p>
          <table>
            <thead><tr><th>When</th><th>Change</th><th>By</th><th>Reason</th></tr></thead>
            <tbody>
              {history.history.map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.editedAt).toLocaleString()}</td>
                  <td>{h.previousStatus} → {h.newStatus}</td>
                  <td>{h.editedBy?.name} <span className="muted">({h.editedBy?.role})</span></td>
                  <td>{h.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-ghost btn-sm" onClick={() => setHistory(null)}>Close</button>
        </div>
      )}
    </>
  );
}
