import { useEffect, useState } from 'react';
import { api, errorText } from '../utils/api.js';
import Alert from '../components/Alert.jsx';
import PercentBar from '../components/PercentBar.jsx';

export default function ShortageList() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/courses').then((d) => setCourses(d.courses)).catch((e) => setError(errorText(e)));
  }, []);

  useEffect(() => {
    const q = courseId ? `?courseId=${courseId}` : '';
    api.get(`/attendance/shortage${q}`)
      .then((d) => { setRows(d.shortage); setError(''); })
      .catch((e) => setError(errorText(e)));
  }, [courseId]);

  return (
    <>
      <h1>Attendance shortage list</h1>
      <Alert>{error}</Alert>
      <div className="card">
        <div className="toolbar">
          <label>Course
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">All my courses</option>
              {courses.map((c) => <option key={c._id} value={c._id}>{c.code} – {c.name}</option>)}
            </select>
          </label>
          <span className="muted">{rows.length} student(s) below requirement</span>
        </div>
        <table>
          <thead><tr><th>Roll no.</th><th>Student</th><th>Course</th><th>Attended / Total</th><th>Attendance</th><th>Required</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.studentId}-${r.courseId}`}>
                <td>{r.rollNumber || '—'}</td>
                <td>{r.studentName}</td>
                <td>{r.courseCode}</td>
                <td>{r.attended} / {r.totalClasses}</td>
                <td><PercentBar value={r.percentage} required={r.requiredPercentage} /></td>
                <td>{r.requiredPercentage}%</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="6" className="muted">No students are currently in shortage.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
