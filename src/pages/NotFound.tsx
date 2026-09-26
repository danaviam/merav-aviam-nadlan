import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page-message">
      <h1>העמוד לא נמצא</h1>
      <p>ייתכן שהקישור שגוי או שהעמוד הוסר.</p>
      <Link className="btn btn--sea" to="/">לדף הבית</Link>
    </div>
  );
}
