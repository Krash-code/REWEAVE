export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="loader" role="status">
      <span className="loader-mark" />
      <span>{label}</span>
    </div>
  );
}