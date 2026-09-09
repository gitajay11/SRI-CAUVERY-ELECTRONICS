/**
 * Storefront presentation copy.
 *
 * Kept apart from the catalogue seed in @tamizh/db: this is marketing content
 * the storefront renders, not data the admin manages. Banners and promos that
 * the shop owner does edit live in the Banner table instead.
 */

export interface Testimonial {
  name: string;
  location: string;
  locationTa: string;
  rating: number;
  quote: string;
  quoteTa: string;
  occasion: string;
  occasionTa: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Meena Sundaram',
    location: 'Madurai',
    locationTa: 'மதுரை',
    rating: 5,
    quote:
      'We ordered 150 return gifts for my daughter’s wedding. They were packed neatly, delivered three days early, and the price was better than the local market.',
    quoteTa:
      'என் மகள் திருமணத்திற்கு 150 ரிட்டர்ன் கிஃப்ட் ஆர்டர் செய்தோம். நேர்த்தியாகப் பேக் செய்து, மூன்று நாட்கள் முன்னதாகவே கிடைத்தது. விலையும் உள்ளூர் கடையை விடக் குறைவு.',
    occasion: 'Wedding return gifts',
    occasionTa: 'திருமண ரிட்டர்ன் கிஃப்ட்',
  },
  {
    name: 'Karthik Raman',
    location: 'Coimbatore',
    locationTa: 'கோயம்புத்தூர்',
    rating: 5,
    quote:
      'I have bought a charger, a power bank and earbuds from them. Everything genuine, and when one cable had a problem they replaced it without any argument.',
    quoteTa:
      'சார்ஜர், பவர் பேங்க், இயர்பட்ஸ் வாங்கியுள்ளேன். அனைத்தும் தரமானவை. ஒரு கேபிளில் சிக்கல் வந்தபோது எந்த வாக்குவாதமும் இல்லாமல் மாற்றித் தந்தார்கள்.',
    occasion: 'Repeat customer',
    occasionTa: 'தொடர் வாடிக்கையாளர்',
  },
  {
    name: 'Anitha Jayaraman',
    location: 'Chennai',
    locationTa: 'சென்னை',
    rating: 4,
    quote:
      'The Tamil option on the website made it easy for my mother to choose the gifts herself. Small thing, but it mattered to us.',
    quoteTa:
      'இணையதளத்தில் தமிழ் வசதி இருந்ததால் என் அம்மாவே பரிசுகளைத் தேர்ந்தெடுத்தார். சிறிய விஷயம்தான், ஆனால் எங்களுக்கு முக்கியமானது.',
    occasion: 'Baby shower gifts',
    occasionTa: 'வளைகாப்பு பரிசுகள்',
  },
  {
    name: 'Suresh Babu',
    location: 'Trichy',
    locationTa: 'திருச்சி',
    rating: 5,
    quote:
      'Ordered 40 flasks for our office Deepavali gifting. They handled the bulk order over WhatsApp and invoiced properly for GST.',
    quoteTa:
      'எங்கள் அலுவலக தீபாவளி பரிசுக்காக 40 ஃபிளாஸ்க் ஆர்டர் செய்தேன். வாட்ஸ்அப்பிலேயே மொத்த ஆர்டரைக் கவனித்து, GST பில்லும் சரியாகக் கொடுத்தார்கள்.',
    occasion: 'Corporate gifting',
    occasionTa: 'நிறுவனப் பரிசு',
  },
];

/** Search terms shown as chips under an empty search box. */
export const POPULAR_SEARCHES = [
  'fast charger',
  'return gift',
  'bluetooth speaker',
  'power bank',
  'led bulb',
  'wedding gift',
];
