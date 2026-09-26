import { FaWhatsapp } from 'react-icons/fa6';
import { SITE, whatsappHref } from '../config';
import { NETWORKS } from './SocialLinks';

/** כפתורים צפים: רשתות חברתיות (מ-SITE.floatingSocials) ומתחתן כפתור הוואטסאפ */
export function WhatsAppFab() {
  const socials = SITE.floatingSocials.filter((k) => SITE.social[k]);
  return (
    <div className="fab-stack">
      {socials.map((k) => {
        const { icon: Icon, label } = NETWORKS[k];
        return (
          <a
            key={k}
            className={`fab-social fab-social--${k}`}
            href={SITE.social[k]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} (נפתח בחלון חדש)`}
            title={label}
          >
            <Icon aria-hidden />
          </a>
        );
      })}
      <a
        className="wa-fab"
        href={whatsappHref('היי, הגעתי דרך האתר ואשמח לשמוע פרטים')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="שליחת הודעת וואטסאפ"
      >
        <FaWhatsapp aria-hidden />
      </a>
    </div>
  );
}
