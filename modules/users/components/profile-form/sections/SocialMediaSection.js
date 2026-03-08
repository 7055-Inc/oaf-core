/**
 * Social Media Section
 * Personal social media links
 */

import { useProfileForm } from '../ProfileFormContext';

export function getSocialMediaSummary(formData) {
  const platforms = [];
  if (formData.social_facebook) platforms.push('Facebook');
  if (formData.social_instagram) platforms.push('Instagram');
  if (formData.social_tiktok) platforms.push('TikTok');
  if (formData.social_twitter) platforms.push('X');
  if (formData.social_pinterest) platforms.push('Pinterest');
  if (formData.social_whatsapp) platforms.push('WhatsApp');
  
  if (platforms.length === 0) return null;
  return `${platforms.length} connected`;
}

// Helper to extract username from URL or return as-is
function extractUsername(url, prefix) {
  if (!url) return '';
  return url.replace(prefix, '');
}

// Helper to build URL from username
function buildUrl(username, prefix) {
  if (!username) return '';
  return `${prefix}${username}`;
}

function SocialMediaCard({ icon, name, color, prefix, value, onChange }) {
  const username = extractUsername(value, prefix);
  
  return (
    <div className="social-card">
      <div className="social-card-icon" style={{ color }}>
        {icon}
      </div>
      <div className="social-card-name">{name}</div>
      <div className="social-card-input">
        <span className="social-card-prefix">{prefix.replace('https://', '')}</span>
        <input
          type="text"
          value={username}
          onChange={(e) => onChange(buildUrl(e.target.value, prefix))}
          placeholder="username"
          className="form-input-inline"
        />
      </div>
    </div>
  );
}

export default function SocialMediaSection() {
  const { formData, updateField } = useProfileForm();

  return (
    <div className="form-section">
      <div className="social-grid">
        <SocialMediaCard
          icon={<i className="fab fa-facebook-f"></i>}
          name="Facebook"
          color="#1877F2"
          prefix="https://facebook.com/"
          value={formData.social_facebook}
          onChange={(val) => updateField('social_facebook', val)}
        />
        
        <SocialMediaCard
          icon={<i className="fab fa-instagram"></i>}
          name="Instagram"
          color="#E4405F"
          prefix="https://instagram.com/"
          value={formData.social_instagram}
          onChange={(val) => updateField('social_instagram', val)}
        />
        
        <SocialMediaCard
          icon={<i className="fab fa-tiktok"></i>}
          name="TikTok"
          color="#000000"
          prefix="https://tiktok.com/@"
          value={formData.social_tiktok}
          onChange={(val) => updateField('social_tiktok', val)}
        />
        
        <SocialMediaCard
          icon={<span style={{ fontWeight: 'bold', fontSize: '18px' }}>𝕏</span>}
          name="X (Twitter)"
          color="#000000"
          prefix="https://x.com/"
          value={formData.social_twitter}
          onChange={(val) => updateField('social_twitter', val)}
        />
        
        <SocialMediaCard
          icon={<i className="fab fa-pinterest-p"></i>}
          name="Pinterest"
          color="#BD081C"
          prefix="https://pinterest.com/"
          value={formData.social_pinterest}
          onChange={(val) => updateField('social_pinterest', val)}
        />
        
        <SocialMediaCard
          icon={<i className="fab fa-whatsapp"></i>}
          name="WhatsApp"
          color="#25D366"
          prefix="https://wa.me/"
          value={formData.social_whatsapp}
          onChange={(val) => updateField('social_whatsapp', val)}
        />
      </div>
    </div>
  );
}
