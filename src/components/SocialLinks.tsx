import type { IconType } from 'react-icons';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaWhatsapp, FaYoutube } from 'react-icons/fa6';
import { SITE, type SocialKey } from '../config';

export const NETWORKS: Record<SocialKey, { icon: IconType; label: string }> = {
  facebook: { icon: FaFacebookF, label: 'פייסבוק' },
  instagram: { icon: FaInstagram, label: 'אינסטגרם' },
  whatsapp: { icon: FaWhatsapp, label: 'וואטסאפ' },
  tiktok: { icon: FaTiktok, label: 'טיקטוק' },
  youtube: { icon: FaYoutube, label: 'יוטיוב' },
  linkedin: { icon: FaLinkedinIn, label: 'לינקדאין' },
};

export function SocialLinks({ className = '' }: { className?: string }) {
  const keys = (Object.keys(NETWORKS) as SocialKey[]).filter((k) => SITE.social[k]);
  if (!keys.length) return null;
  return (
    <ul className={`socials ${className}`}>
      {keys.map((k) => {
        const { icon: Icon, label } = NETWORKS[k];
        return (
          <li key={k}>
            <a
              className={`social social--${k}`}
              href={SITE.social[k]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} (נפתח בחלון חדש)`}
              title={label}
            >
              <Icon aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
