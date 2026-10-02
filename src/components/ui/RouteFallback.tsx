/** Full-screen spinner shown while a lazy route chunk is being fetched. */
export function RouteFallback() {
  return (
    <div className="app-shell">
      <div
        className="app-container"
        style={{ flex: 1, display: 'grid', placeItems: 'center' }}
        role="status"
        aria-live="polite"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.9rem',
          }}
        >
          <span className="spinner spinner--lg" />
          <span
            style={{
              color: '#8b93ab',
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Loading
          </span>
        </div>
      </div>
    </div>
  );
}
