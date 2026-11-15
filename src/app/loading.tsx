export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
      role="status"
      aria-label="Loading"
    >
      {/* Logo mark */}
      <svg width="32" height="32" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="20" height="20" stroke="var(--ink)" strokeWidth="1.5"/>
        <circle cx="11" cy="11" r="3" fill="var(--ink)"/>
        <line x1="11" y1="1" x2="11" y2="8" stroke="var(--ink)" strokeWidth="1.5"/>
      </svg>

      {/* Animated progress bar */}
      <div
        style={{
          width: 120,
          height: 2,
          background: "var(--thumb)",
          overflow: "hidden",
          position: "relative",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "40%",
            background: "var(--ink)",
            animation: "loading-sweep 1.4s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes loading-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
