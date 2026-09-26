import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AccessibilityMenu } from './components/AccessibilityMenu';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { WhatsAppFab } from './components/WhatsAppFab';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import Home from './pages/Home';
import { AccessibilityPage, PrivacyPage, TermsPage } from './pages/Legal';
import NotFound from './pages/NotFound';
import PropertyPage from './pages/PropertyPage';

function PublicLayout() {
  return (
    <>
      <a className="skip-link" href="#main">דלג לתוכן</a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
      <AccessibilityMenu />
    </>
  );
}

/** גלילה לראש העמוד במעבר עמוד, או לעוגן (#contact) כשיש */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    let tries = 0;
    const id = hash.slice(1);
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 20) {
        clearInterval(timer);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
    return () => clearInterval(timer);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      {/* סטטיסטיקת כניסות של Vercel, בלי עוגיות. לא סופרים את איזור הניהול */}
      <Analytics beforeSend={(e) => (new URL(e.url).pathname.startsWith('/admin') ? null : e)} />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="property/:id" element={<PropertyPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="accessibility" element={<AccessibilityPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="admin/login" element={<AdminLogin />} />
        <Route path="admin" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}
