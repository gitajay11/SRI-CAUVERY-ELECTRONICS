/**
 * Shop identity and contact details.
 *
 * Anything a shop owner might reasonably want to change without touching
 * components lives here, sourced from NEXT_PUBLIC_* variables where it makes
 * sense to differ per deployment.
 */

export const shopConfig = {
  nameEn: 'Sri Cauvery Electronics',
  nameTa: 'ஸ்ரீ காவேரி மின்னணுவியல்',
  taglineEn: 'Electronics & Gifts for Every Occasion',
  taglineTa: 'ஒவ்வொரு நிகழ்விற்கும் மின்னணுவியல் & பரிசுகள்',

  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '+91 93616 70148',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@tamizhelectronics.in',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '919361670148',

  address: {
    line1: 'SPD Nagar, No:15, Kumbakonam Main Road',
    line2: 'Sabapathy Nagar, Vadakuthu',
    city: 'Neyveli',
    district: 'Cuddalore',
    state: 'Tamil Nadu',
    pincode: '607308',
  },

  /** The shop on a map. Directions open Google Maps navigation on a phone. */
  location: {
    latitude: 11.6110215,
    longitude: 79.5497598,
    mapUrl: 'https://maps.app.goo.gl/tDZ5CeSUYh5tUKCE6',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11.6110215,79.5497598',
    embedUrl: 'https://www.google.com/maps?q=11.6110215,79.5497598&z=17&output=embed',
  },

  hoursEn: 'Monday to Saturday, 9:30 am – 8:30 pm',
  hoursTa: 'திங்கள் முதல் சனி வரை, காலை 9:30 – இரவு 8:30',

  /** Used for Organization structured data and the footer. */
  foundedYear: 2009,
  gstin: '33ABCDE1234F1Z5',
} as const;

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${shopConfig.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function formattedAddress(): string {
  const { line1, line2, city, district, state, pincode } = shopConfig.address;
  return `${line1}, ${line2}, ${city}, ${district} District, ${state} ${pincode}`;
}
