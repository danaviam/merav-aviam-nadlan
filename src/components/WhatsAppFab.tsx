import { FaWhatsapp } from 'react-icons/fa6';
import { whatsappHref } from '../config';

export function WhatsAppFab() {
  return (
    <a
      className="wa-fab"
      href={whatsappHref('היי, הגעתי דרך האתר ואשמח לשמוע פרטים')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="שליחת הודעת וואטסאפ"
    >
      <FaWhatsapp aria-hidden />
    </a>
  );
}
