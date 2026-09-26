import { Link } from 'react-router-dom';

/** בית בבנייה עם עגורן – "העמוד הזה עוד לא נבנה" */
function HouseUnderConstruction() {
  return (
    <svg className="nf-art" viewBox="0 0 360 240" role="img" aria-labelledby="nf-art-title">
      <title id="nf-art-title">איור של בית בבנייה עם עגורן ושלט 404</title>

      {/* קרקע */}
      <path d="M10 214h340" stroke="var(--stone)" strokeWidth="4" strokeLinecap="round" />

      {/* עגורן */}
      <g stroke="var(--sea)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M290 214V40" />
        <path d="M300 214V40" />
        {[60, 90, 120, 150, 180].map((y) => (
          <path key={y} d={`M290 ${y + 30}l10-30`} strokeWidth="2.5" />
        ))}
        <path d="M150 40h170" />
        <path d="M150 52h150" strokeWidth="2.5" />
        {[165, 195, 225, 255].map((x) => (
          <path key={x} d={`M${x} 52l15-12`} strokeWidth="2.5" />
        ))}
        <path d="M295 40l-10-18h20z" fill="var(--sea)" />
      </g>
      <rect x="306" y="42" width="18" height="16" rx="2" fill="var(--sea-2)" />
      <g className="nf-hook">
        <path d="M245 52v60" stroke="var(--muted)" strokeWidth="2" />
        <path d="M245 112a6 6 0 1 1-6 6" stroke="var(--muted)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="220" y="124" width="50" height="10" rx="2" fill="var(--sand)" />
      </g>

      {/* שלד הבית */}
      <g stroke="var(--sea)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M50 214V140h150v74" />
        <path d="M40 146l85-62 85 62" />
        <path d="M100 214v-74M150 214v-74M50 177h150" strokeWidth="3" strokeDasharray="7 7" />
      </g>
      {/* לבנים שכבר הונחו */}
      <g fill="var(--bloom)" opacity="0.85">
        <rect x="54" y="200" width="22" height="10" rx="1.5" />
        <rect x="79" y="200" width="22" height="10" rx="1.5" />
        <rect x="104" y="200" width="22" height="10" rx="1.5" />
        <rect x="66" y="188" width="22" height="10" rx="1.5" />
        <rect x="91" y="188" width="22" height="10" rx="1.5" />
      </g>

      {/* קונוס */}
      <path d="M232 214l9-30h8l9 30z" fill="#e8742b" />
      <path d="M236 202h18" stroke="var(--white)" strokeWidth="4" />

      {/* שלט 404 */}
      <path d="M142 214v-22M178 214v-22" stroke="var(--muted)" strokeWidth="3" />
      <rect x="128" y="178" width="64" height="24" rx="4" fill="var(--white)" stroke="var(--bloom)" strokeWidth="3" />
      <text x="160" y="195" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--bloom)" fontFamily="Arial, sans-serif">
        404
      </text>
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="container page-message">
      <HouseUnderConstruction />
      <h1>העמוד הזה עוד בבנייה</h1>
      <p>לא מצאנו את מה שחיפשתם. ייתכן שהקישור שגוי, או שהנכס כבר נמכר והעמוד הוסר.</p>
      <div className="nf-actions">
        <Link className="btn btn--sea" to="/">לדף הבית</Link>
        <Link className="btn btn--ghost" to="/#properties">לכל הנכסים</Link>
      </div>
    </div>
  );
}
