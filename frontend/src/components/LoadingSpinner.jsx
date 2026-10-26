export default function LoadingSpinner({ label = 'Loading...', fullPage = false }) {
  const content = (
    <div className="flex-col items-center gap-3" style={{ display: 'flex', padding: '2rem' }}>
      <div className="spinner" />
      {label && <span className="text-muted">{label}</span>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        {content}
      </div>
    );
  }
  return content;
}
