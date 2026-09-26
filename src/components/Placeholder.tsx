/** איור קו-רקיע כשאין עדיין תמונות לנכס. משתנה לפי ה-seed כדי שלא כל הכרטיסים ייראו אותו דבר. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function Placeholder({ seed, className = '' }: { seed: string; className?: string }) {
  let h = hash(seed);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
  const buildings: { x: number; w: number; top: number }[] = [];
  for (let x = -10; x < 420; ) {
    const w = 34 + rnd() * 46;
    buildings.push({ x, w, top: 120 + rnd() * 110 });
    x += w + 4;
  }
  const sunX = 60 + rnd() * 280;
  return (
    <svg
      className={`placeholder ${className}`}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="עדיין אין תמונות לנכס"
    >
      <rect width="400" height="300" fill="#185467" />
      <circle cx={sunX} cy="92" r="30" fill="#D8C3A0" opacity=".85" />
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.top} width={b.w} height={300 - b.top} fill={i % 3 ? '#0F3D4C' : '#0A2B36'} />
          {Array.from({ length: Math.floor((300 - b.top - 16) / 22) }).map((_, r) => (
            <rect key={r} x={b.x + 8} y={b.top + 12 + r * 22} width={b.w - 16} height="6" fill="#D8C3A0" opacity=".16" />
          ))}
        </g>
      ))}
    </svg>
  );
}
