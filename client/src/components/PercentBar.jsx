export default function PercentBar({ value, required }) {
  const low = value < required;
  return (
    <div className="percent">
      <div className="bar" title={`Required: ${required}%`}>
        <div className={`fill ${low ? 'fill-low' : 'fill-ok'}`} style={{ width: `${Math.min(value, 100)}%` }} />
        <div className="required-mark" style={{ left: `${required}%` }} />
      </div>
      <span className={low ? 'text-danger' : 'text-ok'}>{value}%</span>
    </div>
  );
}
