/**
 * Demo catalogue for Sri Cauvery Electronics.
 *
 * This is the single source of truth for both `prisma/seed.ts` (which writes
 * it into PostgreSQL) and the development in-memory repository. It contains
 * only invented shop data — no real customer information.
 *
 * Prices are written in **rupees** here for readability and converted to
 * paise by `paise()` at the point of use.
 */

/** Rupees -> paise. */
export const paise = (rupees: number): number => Math.round(rupees * 100);

export interface CategorySeed {
  slug: string;
  name: string;
  nameTa: string;
  description: string;
  descriptionTa: string;
  /** Key understood by components/ui/CategoryIcon. */
  icon: string;
  sortOrder: number;
  parentSlug?: string;
}

export interface ProductSeed {
  sku: string;
  slug: string;
  name: string;
  nameTa: string;
  description: string;
  descriptionTa: string;
  brand: string;
  /** Rupees. */
  price: number;
  /** Rupees. */
  mrp: number;
  stock: number;
  categorySlug: string;
  tags: string[];
  specs: Record<string, string>;
  isFeatured?: boolean;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  /** Days ago the product was added; drives the "new arrivals" ordering. */
  addedDaysAgo: number;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const CATEGORY_SEED: CategorySeed[] = [
  {
    slug: 'electronics',
    name: 'Electronics',
    nameTa: 'மின்னணுப் பொருட்கள்',
    description: 'Chargers, cables, audio and everyday gadgets for the whole family.',
    descriptionTa: 'சார்ஜர்கள், கேபிள்கள், ஆடியோ மற்றும் அன்றாடக் கேட்ஜெட்டுகள்.',
    icon: 'chip',
    sortOrder: 1,
  },
  {
    slug: 'return-gifts',
    name: 'Return Gifts',
    nameTa: 'ரிட்டர்ன் கிஃப்ட்',
    description: 'Bulk-friendly gifts for weddings, birthdays and family functions.',
    descriptionTa: 'திருமணம், பிறந்தநாள் மற்றும் குடும்ப நிகழ்வுகளுக்கான மொத்தப் பரிசுகள்.',
    icon: 'gift',
    sortOrder: 2,
  },
  {
    slug: 'home-essentials',
    name: 'Home Essentials',
    nameTa: 'வீட்டுத் தேவைகள்',
    description: 'Small electrical appliances that make everyday work easier.',
    descriptionTa: 'அன்றாட வேலைகளை எளிதாக்கும் சிறு மின்சார உபகரணங்கள்.',
    icon: 'home',
    sortOrder: 3,
  },

  // --- Electronics children ---
  {
    slug: 'mobile-accessories',
    name: 'Mobile Accessories',
    nameTa: 'மொபைல் துணைக்கருவிகள்',
    description: 'Cases, holders, screen guards and everything your phone needs.',
    descriptionTa: 'கவர், ஹோல்டர், ஸ்கிரீன் கார்டு உள்ளிட்ட மொபைல் தேவைகள்.',
    icon: 'phone',
    sortOrder: 1,
    parentSlug: 'electronics',
  },
  {
    slug: 'chargers',
    name: 'Chargers & Adapters',
    nameTa: 'சார்ஜர்கள் & அடாப்டர்கள்',
    description: 'Fast chargers, multi-port adapters and car chargers.',
    descriptionTa: 'ஃபாஸ்ட் சார்ஜர், மல்டி போர்ட் அடாப்டர் மற்றும் கார் சார்ஜர்.',
    icon: 'bolt',
    sortOrder: 2,
    parentSlug: 'electronics',
  },
  {
    slug: 'cables',
    name: 'Cables & Connectors',
    nameTa: 'கேபிள்கள் & இணைப்பிகள்',
    description: 'Braided charging cables, HDMI, AUX and OTG connectors.',
    descriptionTa: 'சார்ஜிங் கேபிள், HDMI, AUX மற்றும் OTG இணைப்பிகள்.',
    icon: 'cable',
    sortOrder: 3,
    parentSlug: 'electronics',
  },
  {
    slug: 'earphones',
    name: 'Earphones & Headsets',
    nameTa: 'இயர்போன் & ஹெட்செட்',
    description: 'Wired earphones, neckbands and true wireless earbuds.',
    descriptionTa: 'வயர் இயர்போன், நெக்பேண்ட் மற்றும் வயர்லெஸ் இயர்பட்ஸ்.',
    icon: 'headphones',
    sortOrder: 4,
    parentSlug: 'electronics',
  },
  {
    slug: 'bluetooth-speakers',
    name: 'Bluetooth Speakers',
    nameTa: 'புளூடூத் ஸ்பீக்கர்கள்',
    description: 'Portable speakers and party boxes with deep bass.',
    descriptionTa: 'ஆழமான பேஸ் கொண்ட போர்ட்டபிள் ஸ்பீக்கர்கள்.',
    icon: 'speaker',
    sortOrder: 5,
    parentSlug: 'electronics',
  },
  {
    slug: 'power-banks',
    name: 'Power Banks',
    nameTa: 'பவர் பேங்க்',
    description: 'Fast-charging power banks from 10,000 mAh upwards.',
    descriptionTa: '10,000 mAh முதல் ஃபாஸ்ட் சார்ஜிங் பவர் பேங்க்.',
    icon: 'battery',
    sortOrder: 6,
    parentSlug: 'electronics',
  },
  {
    slug: 'led-lighting',
    name: 'LED & Lighting',
    nameTa: 'LED & விளக்குகள்',
    description: 'Bulbs, strip lights, emergency lamps and festival lighting.',
    descriptionTa: 'பல்பு, ஸ்ட்ரிப் லைட், அவசர விளக்கு மற்றும் பண்டிகை விளக்குகள்.',
    icon: 'bulb',
    sortOrder: 7,
    parentSlug: 'electronics',
  },
  {
    slug: 'gadgets',
    name: 'Smart Gadgets',
    nameTa: 'ஸ்மார்ட் கேட்ஜெட்டுகள்',
    description: 'Smart watches, trackers and handy little electronics.',
    descriptionTa: 'ஸ்மார்ட் வாட்ச், டிராக்கர் மற்றும் பயனுள்ள சிறு மின்னணுப் பொருட்கள்.',
    icon: 'watch',
    sortOrder: 8,
    parentSlug: 'electronics',
  },

  // --- Return gift children ---
  {
    slug: 'birthday-return-gifts',
    name: 'Birthday Return Gifts',
    nameTa: 'பிறந்தநாள் ரிட்டர்ன் கிஃப்ட்',
    description: 'Colourful, budget-friendly gifts children love to take home.',
    descriptionTa: 'குழந்தைகள் விரும்பும் வண்ணமயமான, சிக்கனமான பரிசுகள்.',
    icon: 'cake',
    sortOrder: 1,
    parentSlug: 'return-gifts',
  },
  {
    slug: 'wedding-return-gifts',
    name: 'Wedding Return Gifts',
    nameTa: 'திருமண ரிட்டர்ன் கிஃப்ட்',
    description: 'Elegant thamboolam bags, lamps and useful household gifts.',
    descriptionTa: 'தாம்பூலப் பைகள், குத்துவிளக்குகள் மற்றும் பயனுள்ள வீட்டுப் பரிசுகள்.',
    icon: 'lamp',
    sortOrder: 2,
    parentSlug: 'return-gifts',
  },
  {
    slug: 'kids-return-gifts',
    name: 'Kids Return Gifts',
    nameTa: 'குழந்தைகள் ரிட்டர்ன் கிஃப்ட்',
    description: 'Stationery sets, activity kits and small toys.',
    descriptionTa: 'ஸ்டேஷனரி செட், செயல்பாட்டுக் கிட் மற்றும் சிறு பொம்மைகள்.',
    icon: 'toy',
    sortOrder: 3,
    parentSlug: 'return-gifts',
  },
  {
    slug: 'baby-shower-gifts',
    name: 'Baby Shower Gifts',
    nameTa: 'வளைகாப்பு பரிசுகள்',
    description: 'Sweet keepsakes and useful gifts for valaikaappu functions.',
    descriptionTa: 'வளைகாப்பு நிகழ்வுக்கான அழகான, பயனுள்ள பரிசுகள்.',
    icon: 'baby',
    sortOrder: 4,
    parentSlug: 'return-gifts',
  },
  {
    slug: 'housewarming-gifts',
    name: 'Housewarming Gifts',
    nameTa: 'கிரகப்பிரவேச பரிசுகள்',
    description: 'Practical gifts for a new home — lamps, containers and more.',
    descriptionTa: 'புதிய வீட்டிற்கான விளக்குகள், கொள்கலன்கள் போன்ற பயனுள்ள பரிசுகள்.',
    icon: 'house',
    sortOrder: 5,
    parentSlug: 'return-gifts',
  },
  {
    slug: 'festival-gifts',
    name: 'Festival Gifts',
    nameTa: 'பண்டிகைப் பரிசுகள்',
    description: 'Deepavali, Pongal and Navaratri hampers and lighting.',
    descriptionTa: 'தீபாவளி, பொங்கல், நவராத்திரி ஹாம்பர் மற்றும் விளக்குகள்.',
    icon: 'diya',
    sortOrder: 6,
    parentSlug: 'return-gifts',
  },
  {
    slug: 'corporate-gifts',
    name: 'Corporate Gifts',
    nameTa: 'நிறுவனப் பரிசுகள்',
    description: 'Desk sets, bottles and branded gifting for offices.',
    descriptionTa: 'அலுவலகங்களுக்கான டெஸ்க் செட், பாட்டில் மற்றும் பிராண்டட் பரிசுகள்.',
    icon: 'briefcase',
    sortOrder: 7,
    parentSlug: 'return-gifts',
  },

  // --- Home essentials children ---
  {
    slug: 'kitchen-gadgets',
    name: 'Kitchen Gadgets',
    nameTa: 'சமையலறை உபகரணங்கள்',
    description: 'Small appliances that speed up everyday cooking.',
    descriptionTa: 'அன்றாட சமையலை வேகமாக்கும் சிறு உபகரணங்கள்.',
    icon: 'kettle',
    sortOrder: 1,
    parentSlug: 'home-essentials',
  },
  {
    slug: 'home-comfort',
    name: 'Home Comfort',
    nameTa: 'வீட்டு வசதிகள்',
    description: 'Fans, irons and everyday electricals for the home.',
    descriptionTa: 'மின்விசிறி, அயர்ன் பாக்ஸ் உள்ளிட்ட வீட்டு மின்சாதனங்கள்.',
    icon: 'fan',
    sortOrder: 2,
    parentSlug: 'home-essentials',
  },
];

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const PRODUCT_SEED: ProductSeed[] = [
  // ---- chargers ----------------------------------------------------------
  {
    sku: 'TE-CHG-2001',
    slug: 'volton-33w-fast-charger',
    name: 'Volton 33W Fast Charger with Type-C Cable',
    nameTa: 'வோல்டன் 33W ஃபாஸ்ட் சார்ஜர் (டைப்-C கேபிளுடன்)',
    description:
      'A 33W wall charger that takes most phones from empty to 60% in about half an hour. Built-in over-voltage and over-heat protection, and a 1 metre Type-C cable is included in the box so nothing else is needed.',
    descriptionTa:
      'பெரும்பாலான மொபைல்களை அரை மணி நேரத்தில் 60% வரை சார்ஜ் செய்யும் 33W சார்ஜர். அதிக மின்னழுத்தம் மற்றும் வெப்பத்திலிருந்து பாதுகாப்பு. 1 மீட்டர் டைப்-C கேபிள் உடன் வழங்கப்படுகிறது.',
    brand: 'Volton',
    price: 649,
    mrp: 1099,
    stock: 84,
    categorySlug: 'chargers',
    tags: ['fast charger', 'type-c', '33w', 'mobile'],
    specs: {
      Output: '33W max (11V/3A)',
      Ports: '1 × USB-A',
      'Cable included': 'Type-C, 1 m',
      Protection: 'Over-current, over-voltage, over-heat',
      Warranty: '1 year',
    },
    isFeatured: true,
    ratingAvg: 4.5,
    ratingCount: 214,
    soldCount: 1180,
    addedDaysAgo: 120,
  },
  {
    sku: 'TE-CHG-2002',
    slug: 'volton-4-port-usb-adapter',
    name: 'Volton 4-Port USB Charging Station',
    nameTa: 'வோல்டன் 4-போர்ட் USB சார்ஜிங் ஸ்டேஷன்',
    description:
      'One adapter for the whole family. Four smart-detect USB ports share 45W and charge phones, earbuds and a power bank at the same time, without heating up.',
    descriptionTa:
      'குடும்பம் முழுவதற்கும் ஒரே அடாப்டர். நான்கு ஸ்மார்ட் USB போர்ட்கள் 45W ஐப் பகிர்ந்து மொபைல், இயர்பட்ஸ், பவர் பேங்க் அனைத்தையும் ஒரே நேரத்தில் சார்ஜ் செய்யும்.',
    brand: 'Volton',
    price: 899,
    mrp: 1499,
    stock: 46,
    categorySlug: 'chargers',
    tags: ['multi port', 'usb', 'family', 'desk'],
    specs: {
      Output: '45W shared',
      Ports: '4 × USB-A smart detect',
      Input: '100–240V AC',
      Warranty: '1 year',
    },
    ratingAvg: 4.3,
    ratingCount: 96,
    soldCount: 430,
    addedDaysAgo: 74,
  },
  {
    sku: 'TE-CHG-2003',
    slug: 'roadmate-dual-car-charger',
    name: 'RoadMate Dual-Port Car Charger 38W',
    nameTa: 'ரோட்மேட் இரட்டை போர்ட் கார் சார்ஜர் 38W',
    description:
      'Compact metal-body car charger with one USB-C PD port and one USB-A port. The blue indicator ring makes it easy to find the socket at night.',
    descriptionTa:
      'ஒரு USB-C PD மற்றும் ஒரு USB-A போர்ட் கொண்ட சிறிய உலோக கார் சார்ஜர். நீல ஒளி வளையம் இரவில் எளிதாகக் கண்டுபிடிக்க உதவும்.',
    brand: 'RoadMate',
    price: 449,
    mrp: 799,
    stock: 120,
    categorySlug: 'chargers',
    tags: ['car charger', 'usb-c', 'pd', 'travel'],
    specs: {
      Output: '38W total (20W PD + 18W QC)',
      Ports: 'USB-C + USB-A',
      Body: 'Aluminium alloy',
      Warranty: '6 months',
    },
    ratingAvg: 4.2,
    ratingCount: 61,
    soldCount: 305,
    addedDaysAgo: 40,
  },

  // ---- cables ------------------------------------------------------------
  {
    sku: 'TE-CBL-3001',
    slug: 'lineon-braided-type-c-cable-1-5m',
    name: 'LineOn Braided Type-C Cable 1.5 m',
    nameTa: 'லைன்ஆன் பிரெய்டட் டைப்-C கேபிள் 1.5 மீ',
    description:
      'Nylon-braided cable rated for 10,000 bends, with reinforced joints at both ends — the part that usually gives way first. Supports 65W charging and 480 Mbps data.',
    descriptionTa:
      '10,000 முறை மடக்கினாலும் தாங்கும் நைலான் பிரெய்டட் கேபிள். இரு முனைகளிலும் வலுவூட்டப்பட்ட இணைப்பு. 65W சார்ஜிங் மற்றும் 480 Mbps டேட்டா ஆதரவு.',
    brand: 'LineOn',
    price: 249,
    mrp: 499,
    stock: 260,
    categorySlug: 'cables',
    tags: ['cable', 'type-c', 'braided', 'fast charging'],
    specs: {
      Length: '1.5 m',
      'Charging support': 'Up to 65W',
      'Data speed': '480 Mbps',
      Build: 'Nylon braided, aluminium shell',
      Warranty: '6 months',
    },
    isFeatured: true,
    ratingAvg: 4.4,
    ratingCount: 342,
    soldCount: 2140,
    addedDaysAgo: 200,
  },
  {
    sku: 'TE-CBL-3002',
    slug: 'lineon-3-in-1-charging-cable',
    name: 'LineOn 3-in-1 Charging Cable',
    nameTa: 'லைன்ஆன் 3-இன்-1 சார்ஜிங் கேபிள்',
    description:
      'One cable with Type-C, Micro-USB and Lightning tips, so a single cable in the bag charges every phone in the house.',
    descriptionTa:
      'டைப்-C, மைக்ரோ-USB மற்றும் லைட்னிங் முனைகள் கொண்ட ஒரே கேபிள். வீட்டில் உள்ள அனைத்து மொபைல்களுக்கும் இது ஒன்றே போதும்.',
    brand: 'LineOn',
    price: 299,
    mrp: 599,
    stock: 148,
    categorySlug: 'cables',
    tags: ['cable', '3 in 1', 'multi device', 'travel'],
    specs: {
      Length: '1.2 m',
      Connectors: 'Type-C, Micro-USB, Lightning',
      'Charging support': 'Up to 3A',
      Warranty: '6 months',
    },
    ratingAvg: 4.1,
    ratingCount: 128,
    soldCount: 760,
    addedDaysAgo: 88,
  },
  {
    sku: 'TE-CBL-3003',
    slug: 'lineon-hdmi-2-0-cable-2m',
    name: 'LineOn HDMI 2.0 Cable 2 m (4K 60Hz)',
    nameTa: 'லைன்ஆன் HDMI 2.0 கேபிள் 2 மீ (4K 60Hz)',
    description:
      'Gold-plated HDMI cable for connecting a laptop, set-top box or console to the TV at full 4K 60Hz with ARC audio support.',
    descriptionTa:
      'லேப்டாப், செட்-டாப் பாக்ஸ் அல்லது கன்சோலை டிவியுடன் இணைக்க தங்க முலாம் பூசப்பட்ட HDMI கேபிள். 4K 60Hz மற்றும் ARC ஆடியோ ஆதரவு.',
    brand: 'LineOn',
    price: 399,
    mrp: 799,
    stock: 72,
    categorySlug: 'cables',
    tags: ['hdmi', '4k', 'tv', 'laptop'],
    specs: {
      Version: 'HDMI 2.0',
      Resolution: '4K at 60Hz',
      Length: '2 m',
      Audio: 'ARC supported',
      Warranty: '1 year',
    },
    ratingAvg: 4.6,
    ratingCount: 54,
    soldCount: 190,
    addedDaysAgo: 30,
  },

  // ---- earphones ---------------------------------------------------------
  {
    sku: 'TE-EAR-4001',
    slug: 'sonix-buds-pro-tws',
    name: 'Sonix Buds Pro True Wireless Earbuds',
    nameTa: 'சோனிக்ஸ் பட்ஸ் ப்ரோ வயர்லெஸ் இயர்பட்ஸ்',
    description:
      'Comfortable in-ear buds with 40 hours of total playback, environmental noise cancellation on calls, and a 10-minute quick charge that gives about 2 hours of music.',
    descriptionTa:
      '40 மணி நேர மொத்த பிளேபேக், அழைப்புகளில் இரைச்சல் நீக்கம் மற்றும் 10 நிமிட சார்ஜில் 2 மணி நேர இசை தரும் வசதியான இயர்பட்ஸ்.',
    brand: 'Sonix',
    price: 1499,
    mrp: 2999,
    stock: 58,
    categorySlug: 'earphones',
    tags: ['tws', 'earbuds', 'bluetooth', 'enc', 'wireless'],
    specs: {
      'Playback time': 'Up to 40 hours with case',
      Bluetooth: 'v5.3',
      Driver: '13 mm dynamic',
      'Call quality': 'Quad-mic ENC',
      'Water resistance': 'IPX5',
      Warranty: '1 year',
    },
    isFeatured: true,
    ratingAvg: 4.3,
    ratingCount: 486,
    soldCount: 1620,
    addedDaysAgo: 55,
  },
  {
    sku: 'TE-EAR-4002',
    slug: 'sonix-neckband-bass-40',
    name: 'Sonix Bass 40 Bluetooth Neckband',
    nameTa: 'சோனிக்ஸ் பேஸ் 40 புளூடூத் நெக்பேண்ட்',
    description:
      'A light neckband for long commutes: 40 hours of playtime, magnetic earbuds that clip together, and a dedicated bass button.',
    descriptionTa:
      'நீண்ட பயணங்களுக்கு ஏற்ற இலகுவான நெக்பேண்ட். 40 மணி நேர பிளேடைம், காந்த இயர்பட்ஸ் மற்றும் தனி பேஸ் பட்டன்.',
    brand: 'Sonix',
    price: 899,
    mrp: 1799,
    stock: 96,
    categorySlug: 'earphones',
    tags: ['neckband', 'bluetooth', 'bass', 'commute'],
    specs: {
      'Playback time': 'Up to 40 hours',
      Bluetooth: 'v5.2',
      Driver: '10 mm',
      Charging: 'Type-C, 2 hours',
      Warranty: '1 year',
    },
    ratingAvg: 4.2,
    ratingCount: 233,
    soldCount: 980,
    addedDaysAgo: 140,
  },
  {
    sku: 'TE-EAR-4003',
    slug: 'sonix-wired-earphone-mic',
    name: 'Sonix Wired Earphones with Mic',
    nameTa: 'சோனிக்ஸ் வயர் இயர்போன் (மைக்குடன்)',
    description:
      'A dependable wired pair for classes and calls. Tangle-resistant flat cable, 3.5 mm jack and an inline mic with a call button.',
    descriptionTa:
      'வகுப்புகள் மற்றும் அழைப்புகளுக்கு நம்பகமான வயர் இயர்போன். சிக்காத தட்டையான கேபிள், 3.5 மி.மீ ஜாக் மற்றும் இன்லைன் மைக்.',
    brand: 'Sonix',
    price: 249,
    mrp: 499,
    stock: 310,
    categorySlug: 'earphones',
    tags: ['wired', 'earphone', 'mic', '3.5mm', 'budget'],
    specs: {
      Connector: '3.5 mm',
      Driver: '10 mm',
      'Cable length': '1.2 m flat',
      Mic: 'Inline with call button',
      Warranty: '6 months',
    },
    ratingAvg: 4.0,
    ratingCount: 174,
    soldCount: 1450,
    addedDaysAgo: 260,
  },

  // ---- bluetooth speakers -------------------------------------------------
  {
    sku: 'TE-SPK-5001',
    slug: 'sonix-boom-12w-portable-speaker',
    name: 'Sonix Boom 12W Portable Bluetooth Speaker',
    nameTa: 'சோனிக்ஸ் பூம் 12W போர்ட்டபிள் புளூடூத் ஸ்பீக்கர்',
    description:
      'Pocket-sized 12W speaker with a passive bass radiator, 12 hours of playback and an IPX6 body that survives a splash at the beach or on the terrace.',
    descriptionTa:
      'பேசிவ் பேஸ் ரேடியேட்டர் கொண்ட 12W சிறிய ஸ்பீக்கர். 12 மணி நேர பிளேபேக் மற்றும் IPX6 நீர்த்தடுப்பு.',
    brand: 'Sonix',
    price: 1299,
    mrp: 2499,
    stock: 64,
    categorySlug: 'bluetooth-speakers',
    tags: ['speaker', 'bluetooth', 'portable', 'ipx6', 'bass'],
    specs: {
      Output: '12W RMS',
      'Playback time': 'Up to 12 hours',
      Bluetooth: 'v5.3',
      Extras: 'AUX, microSD, FM radio',
      'Water resistance': 'IPX6',
      Warranty: '1 year',
    },
    isFeatured: true,
    ratingAvg: 4.5,
    ratingCount: 312,
    soldCount: 890,
    addedDaysAgo: 65,
  },
  {
    sku: 'TE-SPK-5002',
    slug: 'sonix-party-box-40w',
    name: 'Sonix Party Box 40W Speaker with RGB Lights',
    nameTa: 'சோனிக்ஸ் பார்ட்டி பாக்ஸ் 40W ஸ்பீக்கர் (RGB விளக்குகளுடன்)',
    description:
      'Enough sound for a terrace function. 40W output, pulsing RGB lights, wireless mic input for antakshari, and a shoulder strap for carrying.',
    descriptionTa:
      'மாடி நிகழ்ச்சிகளுக்குப் போதுமான ஒலி. 40W வெளியீடு, RGB விளக்குகள், வயர்லெஸ் மைக் இணைப்பு மற்றும் சுமக்க தோள்பட்டை.',
    brand: 'Sonix',
    price: 3499,
    mrp: 5999,
    stock: 22,
    categorySlug: 'bluetooth-speakers',
    tags: ['speaker', 'party', '40w', 'rgb', 'function'],
    specs: {
      Output: '40W RMS',
      'Playback time': 'Up to 8 hours',
      Lights: 'RGB, music sync',
      Inputs: 'Bluetooth, AUX, USB, mic',
      Warranty: '1 year',
    },
    ratingAvg: 4.4,
    ratingCount: 88,
    soldCount: 210,
    addedDaysAgo: 25,
  },

  // ---- power banks -------------------------------------------------------
  {
    sku: 'TE-PWB-6001',
    slug: 'voltcell-10000mah-power-bank',
    name: 'VoltCell 10000mAh Slim Power Bank',
    nameTa: 'வோல்ட்செல் 10000mAh ஸ்லிம் பவர் பேங்க்',
    description:
      'Slim enough for a shirt pocket, with 22.5W fast output and a small display that shows the exact charge left instead of four vague dots.',
    descriptionTa:
      'சட்டைப் பையில் வைக்கும் அளவு மெல்லியது. 22.5W ஃபாஸ்ட் வெளியீடு மற்றும் மீதமுள்ள சார்ஜை துல்லியமாகக் காட்டும் டிஸ்ப்ளே.',
    brand: 'VoltCell',
    price: 1199,
    mrp: 2199,
    stock: 74,
    categorySlug: 'power-banks',
    tags: ['power bank', '10000mah', 'fast charging', 'travel'],
    specs: {
      Capacity: '10000 mAh',
      Output: '22.5W max',
      Ports: 'USB-C in/out, 2 × USB-A',
      Display: 'Digital percentage',
      Warranty: '1 year',
    },
    isFeatured: true,
    ratingAvg: 4.4,
    ratingCount: 267,
    soldCount: 1120,
    addedDaysAgo: 95,
  },
  {
    sku: 'TE-PWB-6002',
    slug: 'voltcell-20000mah-power-bank',
    name: 'VoltCell 20000mAh Power Bank 45W',
    nameTa: 'வோல்ட்செல் 20000mAh பவர் பேங்க் 45W',
    description:
      'Charges a laptop over USB-C PD and still has room for two phones. Sensible pick for long train journeys and power cuts.',
    descriptionTa:
      'USB-C PD மூலம் லேப்டாப்பையும் சார்ஜ் செய்யும், இரண்டு மொபைல்களுக்கும் போதும். நீண்ட ரயில் பயணம் மற்றும் மின்வெட்டுக்கு ஏற்றது.',
    brand: 'VoltCell',
    price: 2199,
    mrp: 3799,
    stock: 38,
    categorySlug: 'power-banks',
    tags: ['power bank', '20000mah', 'laptop', 'pd', '45w'],
    specs: {
      Capacity: '20000 mAh',
      Output: '45W USB-C PD',
      Ports: 'USB-C, 2 × USB-A',
      'Recharge time': 'About 4 hours',
      Warranty: '1 year',
    },
    ratingAvg: 4.5,
    ratingCount: 143,
    soldCount: 470,
    addedDaysAgo: 48,
  },

  // ---- mobile accessories -------------------------------------------------
  {
    sku: 'TE-MOB-7001',
    slug: 'gripon-magnetic-car-mount',
    name: 'GripOn Magnetic Car Phone Mount',
    nameTa: 'கிரிப்ஆன் மேக்னடிக் கார் மொபைல் ஸ்டாண்ட்',
    description:
      'Six N52 magnets hold the phone steady over Chennai potholes. Sticks to the dashboard or clips to the AC vent, and rotates a full 360°.',
    descriptionTa:
      'ஆறு N52 காந்தங்கள் மொபைலை உறுதியாகப் பிடிக்கும். டாஷ்போர்டு அல்லது AC வென்ட்டில் பொருத்தலாம், 360° சுழலும்.',
    brand: 'GripOn',
    price: 399,
    mrp: 899,
    stock: 132,
    categorySlug: 'mobile-accessories',
    tags: ['car mount', 'magnetic', 'holder', 'driving'],
    specs: {
      Mounting: 'Dashboard adhesive + vent clip',
      Magnets: '6 × N52',
      Rotation: '360°',
      Fits: 'Phones up to 7 inches',
      Warranty: '6 months',
    },
    ratingAvg: 4.1,
    ratingCount: 112,
    soldCount: 640,
    addedDaysAgo: 110,
  },
  {
    sku: 'TE-MOB-7002',
    slug: 'gripon-tempered-glass-pack-of-2',
    name: 'GripOn 9H Tempered Glass (Pack of 2)',
    nameTa: 'கிரிப்ஆன் 9H டெம்பர்டு கிளாஸ் (2 எண்ணிக்கை)',
    description:
      '9H hardness screen protection with an oleophobic coating that keeps fingerprints down. Installation frame and cleaning kit included.',
    descriptionTa:
      'கைரேகைகளைத் தடுக்கும் ஓலியோஃபோபிக் பூச்சுடன் 9H திரைப் பாதுகாப்பு. பொருத்தும் சட்டம் மற்றும் சுத்தம் செய்யும் கிட் உடன்.',
    brand: 'GripOn',
    price: 299,
    mrp: 699,
    stock: 214,
    categorySlug: 'mobile-accessories',
    tags: ['screen guard', 'tempered glass', 'protection'],
    specs: {
      Hardness: '9H',
      Quantity: '2 pieces',
      Coating: 'Oleophobic anti-fingerprint',
      Includes: 'Alignment frame, wipes',
    },
    ratingAvg: 4.0,
    ratingCount: 205,
    soldCount: 1310,
    addedDaysAgo: 175,
  },
  {
    sku: 'TE-MOB-7003',
    slug: 'gripon-foldable-phone-stand',
    name: 'GripOn Foldable Aluminium Phone Stand',
    nameTa: 'கிரிப்ஆன் மடக்கு அலுமினியம் மொபைல் ஸ்டாண்ட்',
    description:
      'Folds flat to the size of a card and holds the phone at any angle for video calls, recipes in the kitchen or a class on the desk.',
    descriptionTa:
      'கார்டு அளவுக்கு மடங்கும்; வீடியோ அழைப்பு, சமையல் குறிப்பு அல்லது வகுப்பிற்கு எந்தக் கோணத்திலும் மொபைலைப் பிடிக்கும்.',
    brand: 'GripOn',
    price: 349,
    mrp: 699,
    stock: 158,
    categorySlug: 'mobile-accessories',
    tags: ['stand', 'holder', 'aluminium', 'desk'],
    specs: {
      Material: 'Anodised aluminium',
      Adjustable: 'Tilt and height',
      Fits: 'Phones and tablets up to 10 inches',
      Weight: '118 g',
    },
    ratingAvg: 4.4,
    ratingCount: 77,
    soldCount: 380,
    addedDaysAgo: 35,
  },

  // ---- LED & lighting ----------------------------------------------------
  {
    sku: 'TE-LED-8001',
    slug: 'lumina-9w-led-bulb-pack-of-4',
    name: 'Lumina 9W LED Bulb (Pack of 4)',
    nameTa: 'லுமினா 9W LED பல்பு (4 எண்ணிக்கை)',
    description:
      'Cool daylight bulbs with a wide voltage range, so they keep working steadily through the voltage swings common in many streets.',
    descriptionTa:
      'அகன்ற மின்னழுத்த வரம்பு கொண்ட கூல் டேலைட் பல்புகள். மின்னழுத்த ஏற்ற இறக்கங்களிலும் சீராக எரியும்.',
    brand: 'Lumina',
    price: 449,
    mrp: 799,
    stock: 186,
    categorySlug: 'led-lighting',
    tags: ['led', 'bulb', 'b22', 'lighting', 'home'],
    specs: {
      Wattage: '9W each',
      Quantity: '4 bulbs',
      Base: 'B22 pin',
      'Colour temperature': '6500K cool daylight',
      'Voltage range': '140–300V',
      Warranty: '1 year',
    },
    ratingAvg: 4.3,
    ratingCount: 189,
    soldCount: 1580,
    addedDaysAgo: 210,
  },
  {
    sku: 'TE-LED-8002',
    slug: 'lumina-rgb-strip-light-5m',
    name: 'Lumina RGB Strip Light 5 m with Remote',
    nameTa: 'லுமினா RGB ஸ்ட்ரிப் லைட் 5 மீ (ரிமோட்டுடன்)',
    description:
      'Adhesive-backed colour strip for pooja rooms, TV units and festival decoration. Sixteen colours, four modes and a remote in the box.',
    descriptionTa:
      'பூஜை அறை, டிவி யூனிட் மற்றும் பண்டிகை அலங்காரத்திற்கான ஒட்டும் வண்ண ஸ்ட்ரிப். 16 வண்ணங்கள், 4 முறைகள், ரிமோட் உடன்.',
    brand: 'Lumina',
    price: 599,
    mrp: 1199,
    stock: 92,
    categorySlug: 'led-lighting',
    tags: ['strip light', 'rgb', 'decoration', 'festival', 'diwali'],
    specs: {
      Length: '5 m',
      Colours: '16 with 4 modes',
      Control: 'IR remote',
      Power: '12V adapter included',
      Warranty: '6 months',
    },
    isFeatured: true,
    ratingAvg: 4.2,
    ratingCount: 154,
    soldCount: 720,
    addedDaysAgo: 20,
  },
  {
    sku: 'TE-LED-8003',
    slug: 'lumina-rechargeable-emergency-lamp',
    name: 'Lumina Rechargeable Emergency LED Lamp',
    nameTa: 'லுமினா ரீசார்ஜபிள் அவசர LED விளக்கு',
    description:
      'Comes on by itself when the power goes, and runs about six hours on a full charge. A hook on the back lets it hang from a nail.',
    descriptionTa:
      'மின்சாரம் போனதும் தானாக எரியும்; முழு சார்ஜில் சுமார் 6 மணி நேரம் வேலை செய்யும். பின்புற கொக்கியால் ஆணியில் தொங்கவிடலாம்.',
    brand: 'Lumina',
    price: 799,
    mrp: 1499,
    stock: 68,
    categorySlug: 'led-lighting',
    tags: ['emergency light', 'rechargeable', 'power cut', 'lamp'],
    specs: {
      Brightness: '600 lumens',
      'Backup time': 'Up to 6 hours',
      Battery: '2600 mAh lithium',
      Modes: 'Auto-on, high, low',
      Warranty: '1 year',
    },
    ratingAvg: 4.4,
    ratingCount: 121,
    soldCount: 520,
    addedDaysAgo: 130,
  },

  // ---- gadgets -----------------------------------------------------------
  {
    sku: 'TE-GDT-9001',
    slug: 'pulse-fit-smart-watch',
    name: 'Pulse Fit Smart Watch with Bluetooth Calling',
    nameTa: 'பல்ஸ் ஃபிட் ஸ்மார்ட் வாட்ச் (புளூடூத் அழைப்புடன்)',
    description:
      '1.85-inch display, Bluetooth calling, heart rate and SpO2 tracking, and a week of battery. Over a hundred watch faces, including Tamil date display.',
    descriptionTa:
      '1.85 அங்குல திரை, புளூடூத் அழைப்பு, இதயத்துடிப்பு மற்றும் SpO2 கண்காணிப்பு, ஒரு வார பேட்டரி. தமிழ் தேதி உட்பட 100+ வாட்ச் ஃபேஸ்கள்.',
    brand: 'Pulse',
    price: 1999,
    mrp: 4999,
    stock: 41,
    categorySlug: 'gadgets',
    tags: ['smart watch', 'bluetooth calling', 'fitness', 'wearable'],
    specs: {
      Display: '1.85 inch HD',
      Calling: 'Bluetooth v5.2 with speaker',
      Health: 'Heart rate, SpO2, sleep',
      Battery: '7 days typical use',
      'Water resistance': 'IP67',
      Warranty: '1 year',
    },
    isFeatured: true,
    ratingAvg: 4.1,
    ratingCount: 398,
    soldCount: 1340,
    addedDaysAgo: 60,
  },
  {
    sku: 'TE-GDT-9002',
    slug: 'pulse-smart-tracker-tag',
    name: 'Pulse Smart Tracker Tag',
    nameTa: 'பல்ஸ் ஸ்மார்ட் டிராக்கர் டேக்',
    description:
      'Clip it to keys, a purse or a school bag and find it from the phone. Ring the tag, or ring the phone from the tag when it goes missing at home.',
    descriptionTa:
      'சாவி, பர்ஸ் அல்லது பள்ளிப் பையில் மாட்டி மொபைலில் கண்டறியலாம். டேக்கை ஒலிக்கவைக்கலாம், அல்லது டேக்கிலிருந்து மொபைலை ஒலிக்கவைக்கலாம்.',
    brand: 'Pulse',
    price: 899,
    mrp: 1799,
    stock: 87,
    categorySlug: 'gadgets',
    tags: ['tracker', 'bluetooth', 'keys', 'finder'],
    specs: {
      Range: 'Up to 60 m',
      Battery: 'CR2032, about 1 year',
      Alert: 'Two-way ring',
      Warranty: '6 months',
    },
    ratingAvg: 4.0,
    ratingCount: 66,
    soldCount: 240,
    addedDaysAgo: 15,
  },
  {
    sku: 'TE-GDT-9003',
    slug: 'pulse-mini-usb-desk-fan',
    name: 'Pulse Mini USB Rechargeable Desk Fan',
    nameTa: 'பல்ஸ் மினி USB ரீசார்ஜபிள் டெஸ்க் ஃபேன்',
    description:
      'Silent, rechargeable, and small enough for a study table or an autorickshaw dashboard. Three speeds and a folding stand.',
    descriptionTa:
      'அமைதியான, ரீசார்ஜபிள், படிப்பு மேசை அல்லது ஆட்டோ டாஷ்போர்டுக்கு ஏற்ற சிறிய ஃபேன். மூன்று வேகங்கள், மடக்கு ஸ்டாண்ட்.',
    brand: 'Pulse',
    price: 649,
    mrp: 1299,
    stock: 103,
    categorySlug: 'gadgets',
    tags: ['fan', 'usb', 'rechargeable', 'summer', 'desk'],
    specs: {
      Speeds: '3',
      Battery: '2400 mAh, up to 8 hours',
      Noise: 'Under 35 dB',
      Charging: 'Type-C',
      Warranty: '6 months',
    },
    ratingAvg: 4.2,
    ratingCount: 91,
    soldCount: 410,
    addedDaysAgo: 45,
  },

  // ---- birthday return gifts ----------------------------------------------
  {
    sku: 'TE-RGB-1101',
    slug: 'mini-led-torch-keychain-set-of-12',
    name: 'Mini LED Torch Keychain (Set of 12)',
    nameTa: 'மினி LED டார்ச் கீ செயின் (12 எண்ணிக்கை)',
    description:
      'A return gift that actually gets used. Twelve metal keychain torches, each individually boxed and ready to hand out at the door.',
    descriptionTa:
      'உண்மையாகவே பயன்படும் ரிட்டர்ன் கிஃப்ட். 12 உலோக கீ செயின் டார்ச்கள், ஒவ்வொன்றும் தனித்தனியே பெட்டியில் பேக் செய்யப்பட்டவை.',
    brand: 'Tamizh Gifts',
    price: 599,
    mrp: 1080,
    stock: 140,
    categorySlug: 'birthday-return-gifts',
    tags: ['return gift', 'birthday', 'bulk', 'keychain', 'led'],
    specs: {
      Quantity: '12 pieces',
      Material: 'Aluminium body',
      Battery: 'Included (LR41 × 3)',
      Packing: 'Individual gift boxes',
      'Price per piece': 'About ₹50',
    },
    isFeatured: true,
    ratingAvg: 4.5,
    ratingCount: 176,
    soldCount: 2260,
    addedDaysAgo: 150,
  },
  {
    sku: 'TE-RGB-1102',
    slug: 'cartoon-pencil-box-set-of-12',
    name: 'Cartoon Pencil Box Gift Set (Set of 12)',
    nameTa: 'கார்ட்டூன் பென்சில் பாக்ஸ் பரிசுத் தொகுப்பு (12 எண்ணிக்கை)',
    description:
      'Each box holds two pencils, an eraser, a sharpener and a scale — a complete little kit that parents appreciate as much as the children.',
    descriptionTa:
      'ஒவ்வொரு பெட்டியிலும் இரண்டு பென்சில், அழிப்பான், சீவி மற்றும் ஸ்கேல். குழந்தைகளுக்கும் பெற்றோருக்கும் பிடிக்கும் முழுமையான கிட்.',
    brand: 'Tamizh Gifts',
    price: 720,
    mrp: 1200,
    stock: 96,
    categorySlug: 'birthday-return-gifts',
    tags: ['return gift', 'birthday', 'stationery', 'kids', 'bulk'],
    specs: {
      Quantity: '12 sets',
      Contents: '2 pencils, eraser, sharpener, scale',
      'Age group': '4 years and above',
      'Price per piece': 'About ₹60',
    },
    ratingAvg: 4.3,
    ratingCount: 132,
    soldCount: 1420,
    addedDaysAgo: 105,
  },
  {
    sku: 'TE-RGB-1103',
    slug: 'led-balloon-party-pack-set-of-24',
    name: 'LED Balloon Party Pack (Set of 24)',
    nameTa: 'LED பலூன் பார்ட்டி பேக் (24 எண்ணிக்கை)',
    description:
      'Balloons with a tiny LED inside that glows for about 24 hours — they double as decoration during the party and as the gift afterwards.',
    descriptionTa:
      'உள்ளே சிறிய LED உள்ள பலூன்கள், சுமார் 24 மணி நேரம் ஒளிரும். விழாவின்போது அலங்காரம், பின்பு பரிசு.',
    brand: 'Tamizh Gifts',
    price: 349,
    mrp: 699,
    stock: 210,
    categorySlug: 'birthday-return-gifts',
    tags: ['return gift', 'birthday', 'balloon', 'led', 'party'],
    specs: {
      Quantity: '24 balloons',
      'Glow time': 'About 24 hours',
      Colours: 'Mixed',
      Safety: 'Not for children under 3',
    },
    ratingAvg: 4.1,
    ratingCount: 87,
    soldCount: 930,
    addedDaysAgo: 70,
  },

  // ---- wedding return gifts ------------------------------------------------
  {
    sku: 'TE-RGW-1201',
    slug: 'brass-kuthu-vilakku-set-of-10',
    name: 'Brass Kuthu Vilakku Return Gift (Set of 10)',
    nameTa: 'பித்தளை குத்துவிளக்கு ரிட்டர்ன் கிஃப்ட் (10 எண்ணிக்கை)',
    description:
      'Traditional 4-inch brass lamps, polished and packed in individual velvet pouches — the classic thamboolam gift for weddings and grahapravesam.',
    descriptionTa:
      '4 அங்குல பாரம்பரிய பித்தளை விளக்குகள், மெருகூட்டப்பட்டு தனித்தனி வெல்வெட் பைகளில் பேக் செய்யப்பட்டவை. திருமணம் மற்றும் கிரகப்பிரவேசத்திற்கான தாம்பூலப் பரிசு.',
    brand: 'Tamizh Gifts',
    price: 2450,
    mrp: 3600,
    stock: 34,
    categorySlug: 'wedding-return-gifts',
    tags: ['return gift', 'wedding', 'brass', 'vilakku', 'traditional', 'thamboolam'],
    specs: {
      Quantity: '10 lamps',
      Height: '4 inches',
      Material: 'Brass',
      Packing: 'Velvet pouch each',
      'Price per piece': 'About ₹245',
    },
    isFeatured: true,
    ratingAvg: 4.7,
    ratingCount: 143,
    soldCount: 610,
    addedDaysAgo: 180,
  },
  {
    sku: 'TE-RGW-1202',
    slug: 'steel-water-bottle-set-of-12',
    name: 'Steel Water Bottle Return Gift (Set of 12)',
    nameTa: 'ஸ்டீல் தண்ணீர் பாட்டில் ரிட்டர்ன் கிஃப்ட் (12 எண்ணிக்கை)',
    description:
      'Food-grade 750 ml stainless bottles in a gift carton. Useful long after the function, and light enough to hand out to a hundred guests.',
    descriptionTa:
      'பரிசுப் பெட்டியில் 750 மி.லி உணவுத் தரமான ஸ்டீல் பாட்டில்கள். நிகழ்வுக்குப் பின்னும் நீண்ட காலம் பயன்படும்.',
    brand: 'Tamizh Gifts',
    price: 2880,
    mrp: 4200,
    stock: 48,
    categorySlug: 'wedding-return-gifts',
    tags: ['return gift', 'wedding', 'steel', 'bottle', 'bulk', 'useful'],
    specs: {
      Quantity: '12 bottles',
      Capacity: '750 ml each',
      Material: 'Food-grade stainless steel',
      Packing: 'Printed gift carton',
      'Price per piece': 'About ₹240',
    },
    ratingAvg: 4.4,
    ratingCount: 98,
    soldCount: 520,
    addedDaysAgo: 85,
  },
  {
    sku: 'TE-RGW-1203',
    slug: 'silver-plated-pooja-thali-set-of-6',
    name: 'Silver-Plated Pooja Thali (Set of 6)',
    nameTa: 'வெள்ளி முலாம் பூஜை தட்டு (6 எண்ணிக்கை)',
    description:
      'Six-inch decorated thali with a kumkum holder and a small bell, boxed for gifting to close family at weddings and seemantham.',
    descriptionTa:
      'குங்கும சிமிழ் மற்றும் சிறிய மணியுடன் கூடிய 6 அங்குல அலங்கார தட்டு. நெருங்கிய உறவினர்களுக்கு வழங்கப் பெட்டியில் பேக் செய்யப்பட்டது.',
    brand: 'Tamizh Gifts',
    price: 1890,
    mrp: 2999,
    stock: 26,
    categorySlug: 'wedding-return-gifts',
    tags: ['return gift', 'wedding', 'pooja', 'thali', 'silver plated'],
    specs: {
      Quantity: '6 sets',
      Diameter: '6 inches',
      Finish: 'Silver plated',
      Includes: 'Kumkum holder, bell',
      'Price per piece': 'About ₹315',
    },
    ratingAvg: 4.6,
    ratingCount: 54,
    soldCount: 190,
    addedDaysAgo: 50,
  },

  // ---- kids return gifts --------------------------------------------------
  {
    sku: 'TE-RGK-1301',
    slug: 'colouring-activity-kit-set-of-15',
    name: 'Colouring & Activity Kit (Set of 15)',
    nameTa: 'வண்ணம் தீட்டும் செயல்பாட்டுக் கிட் (15 எண்ணிக்கை)',
    description:
      'Each kit has a colouring book, twelve crayons and a sheet of stickers, in a zip pouch children can reuse for their pencils.',
    descriptionTa:
      'ஒவ்வொரு கிட்டிலும் வண்ணப் புத்தகம், 12 கிரயான்கள் மற்றும் ஸ்டிக்கர் தாள். மீண்டும் பயன்படுத்தக்கூடிய ஜிப் பை.',
    brand: 'Tamizh Gifts',
    price: 975,
    mrp: 1500,
    stock: 72,
    categorySlug: 'kids-return-gifts',
    tags: ['return gift', 'kids', 'activity', 'colouring', 'bulk'],
    specs: {
      Quantity: '15 kits',
      Contents: 'Colouring book, 12 crayons, stickers',
      'Age group': '3 to 10 years',
      'Price per piece': 'About ₹65',
    },
    ratingAvg: 4.4,
    ratingCount: 116,
    soldCount: 880,
    addedDaysAgo: 92,
  },
  {
    sku: 'TE-RGK-1302',
    slug: 'wooden-puzzle-toy-set-of-10',
    name: 'Wooden Puzzle Toy (Set of 10)',
    nameTa: 'மரப் புதிர் பொம்மை (10 எண்ணிக்கை)',
    description:
      'Chunky wooden puzzles finished with non-toxic colours — a quieter, longer-lasting alternative to plastic party favours.',
    descriptionTa:
      'நச்சில்லா வண்ணங்களால் முடிக்கப்பட்ட தடித்த மரப் புதிர்கள். பிளாஸ்டிக் பரிசுகளுக்குப் பதிலாக நீடித்த தேர்வு.',
    brand: 'Tamizh Gifts',
    price: 1250,
    mrp: 1990,
    stock: 54,
    categorySlug: 'kids-return-gifts',
    tags: ['return gift', 'kids', 'wooden', 'puzzle', 'toy', 'eco'],
    specs: {
      Quantity: '10 puzzles',
      Material: 'Pine wood, non-toxic paint',
      'Age group': '3 years and above',
      'Price per piece': 'About ₹125',
    },
    ratingAvg: 4.5,
    ratingCount: 63,
    soldCount: 340,
    addedDaysAgo: 38,
  },

  // ---- baby shower gifts ---------------------------------------------------
  {
    sku: 'TE-RGS-1401',
    slug: 'valaikaappu-bangle-box-set-of-12',
    name: 'Valaikaappu Bangle Gift Box (Set of 12)',
    nameTa: 'வளைகாப்பு வளையல் பரிசுப் பெட்டி (12 எண்ணிக்கை)',
    description:
      'Decorated boxes with a pair of glass bangles, kumkum and a small sweet box holder — ready to hand out at the valaikaappu.',
    descriptionTa:
      'ஒரு ஜோடி கண்ணாடி வளையல், குங்குமம் மற்றும் சிறிய இனிப்புப் பெட்டி வைக்கும் இடம் கொண்ட அலங்காரப் பெட்டிகள்.',
    brand: 'Tamizh Gifts',
    price: 1680,
    mrp: 2400,
    stock: 44,
    categorySlug: 'baby-shower-gifts',
    tags: ['return gift', 'baby shower', 'valaikaappu', 'bangles', 'traditional'],
    specs: {
      Quantity: '12 boxes',
      Contents: 'Glass bangle pair, kumkum holder',
      Packing: 'Decorated gift box',
      'Price per piece': 'About ₹140',
    },
    ratingAvg: 4.6,
    ratingCount: 71,
    soldCount: 280,
    addedDaysAgo: 62,
  },
  {
    sku: 'TE-RGS-1402',
    slug: 'baby-night-lamp-set-of-6',
    name: 'Soft Glow Baby Night Lamp (Set of 6)',
    nameTa: 'மென்மையான ஒளி குழந்தை இரவு விளக்கு (6 எண்ணிக்கை)',
    description:
      'Warm, dimmable USB night lamps in pastel shades. Practical for new parents and pretty enough to sit on a nursery shelf.',
    descriptionTa:
      'பாஸ்டல் நிறங்களில் வெப்பமான, ஒளி குறைக்கக்கூடிய USB இரவு விளக்குகள். புதிய பெற்றோருக்குப் பயனுள்ளது.',
    brand: 'Lumina',
    price: 1140,
    mrp: 1800,
    stock: 58,
    categorySlug: 'baby-shower-gifts',
    tags: ['return gift', 'baby shower', 'night lamp', 'usb', 'gift'],
    specs: {
      Quantity: '6 lamps',
      Power: 'USB, 1W',
      Light: 'Warm white, 3-step dimming',
      'Price per piece': 'About ₹190',
    },
    ratingAvg: 4.3,
    ratingCount: 48,
    soldCount: 210,
    addedDaysAgo: 28,
  },

  // ---- housewarming gifts -------------------------------------------------
  {
    sku: 'TE-RGH-1501',
    slug: 'steel-container-set-of-3',
    name: 'Stainless Steel Container Set (Set of 3)',
    nameTa: 'ஸ்டீல் கொள்கலன் தொகுப்பு (3 எண்ணிக்கை)',
    description:
      'Airtight 500 ml, 750 ml and 1 litre steel containers in a printed gift sleeve — the housewarming gift that ends up in daily use.',
    descriptionTa:
      '500 மி.லி, 750 மி.லி மற்றும் 1 லிட்டர் காற்றுப்புகா ஸ்டீல் கொள்கலன்கள். தினமும் பயன்படும் கிரகப்பிரவேசப் பரிசு.',
    brand: 'Tamizh Gifts',
    price: 849,
    mrp: 1399,
    stock: 66,
    categorySlug: 'housewarming-gifts',
    tags: ['housewarming', 'gift', 'steel', 'kitchen', 'containers'],
    specs: {
      Quantity: '3 containers',
      Sizes: '500 ml, 750 ml, 1 L',
      Material: 'Stainless steel with airtight lid',
      Packing: 'Printed gift sleeve',
    },
    ratingAvg: 4.4,
    ratingCount: 84,
    soldCount: 390,
    addedDaysAgo: 118,
  },
  {
    sku: 'TE-RGH-1502',
    slug: 'led-nameplate-with-tamil-lettering',
    name: 'Personalised LED Nameplate (Tamil or English)',
    nameTa: 'தனிப்பயன் LED பெயர்ப் பலகை (தமிழ் அல்லது ஆங்கிலம்)',
    description:
      'Acrylic nameplate with warm LED backlighting, engraved with the family name in Tamil or English. Made to order in three working days.',
    descriptionTa:
      'குடும்பப் பெயரை தமிழிலோ ஆங்கிலத்திலோ செதுக்கிய, வெப்ப LED ஒளியூட்டப்பட்ட அக்ரிலிக் பெயர்ப் பலகை. 3 வேலை நாட்களில் தயாரிக்கப்படும்.',
    brand: 'Tamizh Gifts',
    price: 1499,
    mrp: 2499,
    stock: 30,
    categorySlug: 'housewarming-gifts',
    tags: ['housewarming', 'nameplate', 'personalised', 'led', 'tamil'],
    specs: {
      Size: '12 × 6 inches',
      Material: 'Acrylic with LED backlight',
      Personalisation: 'Tamil or English engraving',
      'Made to order': '3 working days',
      Warranty: '1 year on lighting',
    },
    isFeatured: true,
    ratingAvg: 4.7,
    ratingCount: 39,
    soldCount: 145,
    addedDaysAgo: 22,
  },

  // ---- festival gifts -----------------------------------------------------
  {
    sku: 'TE-RGF-1601',
    slug: 'deepavali-diya-gift-hamper',
    name: 'Deepavali Diya & Sweets Gift Hamper',
    nameTa: 'தீபாவளி அகல் விளக்கு & இனிப்பு பரிசுத் தொகுப்பு',
    description:
      'A ready-to-give hamper with twelve painted clay diyas, a pack of cotton wicks, a small brass bell and space for a sweet box.',
    descriptionTa:
      '12 வர்ணம் பூசிய மண் அகல்கள், பஞ்சு திரி, சிறிய பித்தளை மணி மற்றும் இனிப்புப் பெட்டிக்கான இடம் கொண்ட தயார் தொகுப்பு.',
    brand: 'Tamizh Gifts',
    price: 699,
    mrp: 1199,
    stock: 88,
    categorySlug: 'festival-gifts',
    tags: ['festival', 'deepavali', 'diya', 'hamper', 'gift'],
    specs: {
      Contents: '12 clay diyas, wicks, brass bell',
      Packing: 'Decorated hamper box',
      Occasion: 'Deepavali, Karthigai',
    },
    isFeatured: true,
    ratingAvg: 4.5,
    ratingCount: 167,
    soldCount: 940,
    addedDaysAgo: 18,
  },
  {
    sku: 'TE-RGF-1602',
    slug: 'pongal-gift-set-with-sugarcane-decor',
    name: 'Pongal Gift Set with Clay Pot & Decor',
    nameTa: 'பொங்கல் பரிசுத் தொகுப்பு (மண் பானை & அலங்காரத்துடன்)',
    description:
      'Traditional pongal paanai with turmeric plant tie, a small kolam stencil and a packet of manjal — everything for the morning of Thai Pongal.',
    descriptionTa:
      'மஞ்சள் கொத்து கட்டும் பாரம்பரிய பொங்கல் பானை, சிறிய கோலம் ஸ்டென்சில் மற்றும் மஞ்சள் பாக்கெட். தைப்பொங்கல் காலைக்கு தேவையான அனைத்தும்.',
    brand: 'Tamizh Gifts',
    price: 549,
    mrp: 899,
    stock: 74,
    categorySlug: 'festival-gifts',
    tags: ['festival', 'pongal', 'clay pot', 'traditional', 'gift'],
    specs: {
      Contents: 'Clay pot, kolam stencil, turmeric packet',
      'Pot capacity': '1.5 litres',
      Occasion: 'Thai Pongal',
    },
    ratingAvg: 4.4,
    ratingCount: 92,
    soldCount: 480,
    addedDaysAgo: 240,
  },

  // ---- corporate gifts ----------------------------------------------------
  {
    sku: 'TE-RGC-1701',
    slug: 'corporate-desk-organiser-gift-set',
    name: 'Corporate Desk Organiser Gift Set',
    nameTa: 'நிறுவன மேசை ஒழுங்கமைப்பு பரிசுத் தொகுப்பு',
    description:
      'Wooden desk organiser with a pen stand, card holder and phone dock, plus a metal pen. Logo engraving available on orders of 25 or more.',
    descriptionTa:
      'பேனா ஸ்டாண்ட், கார்டு ஹோல்டர் மற்றும் மொபைல் டாக் கொண்ட மர மேசை ஒழுங்கமைப்பு, உலோக பேனாவுடன். 25+ ஆர்டர்களுக்கு லோகோ செதுக்கல் உண்டு.',
    brand: 'Tamizh Gifts',
    price: 1290,
    mrp: 2199,
    stock: 40,
    categorySlug: 'corporate-gifts',
    tags: ['corporate', 'gift', 'desk', 'office', 'bulk'],
    specs: {
      Material: 'Sheesham wood',
      Includes: 'Pen stand, card holder, phone dock, metal pen',
      Personalisation: 'Logo engraving on 25+ units',
    },
    ratingAvg: 4.3,
    ratingCount: 37,
    soldCount: 165,
    addedDaysAgo: 76,
  },
  {
    sku: 'TE-RGC-1702',
    slug: 'insulated-steel-flask-set-of-10',
    name: 'Insulated Steel Flask 500 ml (Set of 10)',
    nameTa: 'இன்சுலேட்டட் ஸ்டீல் ஃபிளாஸ்க் 500 மி.லி (10 எண்ணிக்கை)',
    description:
      'Double-walled vacuum flasks that keep filter coffee hot for eight hours. A staple for office gifting and conference giveaways.',
    descriptionTa:
      'எட்டு மணி நேரம் ஃபில்டர் காபியை சூடாக வைக்கும் இரட்டைச் சுவர் வெற்றிட ஃபிளாஸ்க். அலுவலகப் பரிசுகளுக்கு ஏற்றது.',
    brand: 'Tamizh Gifts',
    price: 4490,
    mrp: 6990,
    stock: 18,
    categorySlug: 'corporate-gifts',
    tags: ['corporate', 'flask', 'bottle', 'bulk', 'office'],
    specs: {
      Quantity: '10 flasks',
      Capacity: '500 ml each',
      Retention: 'Hot 8 hours, cold 12 hours',
      'Price per piece': 'About ₹449',
    },
    ratingAvg: 4.5,
    ratingCount: 29,
    soldCount: 110,
    addedDaysAgo: 33,
  },

  // ---- kitchen gadgets ----------------------------------------------------
  {
    sku: 'TE-KIT-2101',
    slug: 'homechef-1-5l-electric-kettle',
    name: 'HomeChef 1.5L Stainless Electric Kettle',
    nameTa: 'ஹோம்செஃப் 1.5L ஸ்டீல் மின்சார கெட்டில்',
    description:
      'Boils 1.5 litres in about six minutes, with auto cut-off and boil-dry protection. Concealed element, so it stays easy to clean.',
    descriptionTa:
      '1.5 லிட்டரை சுமார் 6 நிமிடங்களில் கொதிக்கவைக்கும். தானியங்கி நிறுத்தம் மற்றும் வறண்டு போகும் பாதுகாப்பு. சுத்தம் செய்ய எளிதானது.',
    brand: 'HomeChef',
    price: 1099,
    mrp: 1999,
    stock: 52,
    categorySlug: 'kitchen-gadgets',
    tags: ['kettle', 'kitchen', 'electric', 'home'],
    specs: {
      Capacity: '1.5 litres',
      Power: '1500W',
      Body: 'Stainless steel',
      Safety: 'Auto cut-off, boil-dry protection',
      Warranty: '1 year',
    },
    ratingAvg: 4.3,
    ratingCount: 148,
    soldCount: 620,
    addedDaysAgo: 100,
  },
  {
    sku: 'TE-KIT-2102',
    slug: 'homechef-hand-blender-300w',
    name: 'HomeChef 300W Hand Blender',
    nameTa: 'ஹோம்செஃப் 300W ஹேண்ட் பிளெண்டர்',
    description:
      'Two speeds and a detachable stainless shaft for chutney, milkshakes and baby food. Fits in a drawer, unlike a full mixer.',
    descriptionTa:
      'சட்னி, மில்க்ஷேக் மற்றும் குழந்தை உணவுக்கு இரண்டு வேகங்கள் மற்றும் கழற்றக்கூடிய ஸ்டீல் தண்டு. மிக்ஸியைப் போலன்றி டிராயரில் அடங்கும்.',
    brand: 'HomeChef',
    price: 999,
    mrp: 1799,
    stock: 61,
    categorySlug: 'kitchen-gadgets',
    tags: ['blender', 'kitchen', 'mixer', 'home'],
    specs: {
      Power: '300W',
      Speeds: '2',
      Shaft: 'Detachable stainless steel',
      Warranty: '1 year',
    },
    ratingAvg: 4.1,
    ratingCount: 102,
    soldCount: 440,
    addedDaysAgo: 58,
  },
  {
    sku: 'TE-KIT-2103',
    slug: 'homechef-digital-kitchen-scale',
    name: 'HomeChef Digital Kitchen Scale 10 kg',
    nameTa: 'ஹோம்செஃப் டிஜிட்டல் சமையலறை தராசு 10 கி.கி',
    description:
      'Weighs to the gram up to 10 kg, with a tare button for measuring straight into a vessel. Useful for baking and for weighing parcels.',
    descriptionTa:
      '10 கி.கி வரை கிராம் அளவில் எடை பார்க்கும், பாத்திரத்தில் நேரடியாக அளக்க டேர் பட்டன். பேக்கிங் மற்றும் பார்சல் எடைக்கு உதவும்.',
    brand: 'HomeChef',
    price: 649,
    mrp: 1299,
    stock: 79,
    categorySlug: 'kitchen-gadgets',
    tags: ['scale', 'kitchen', 'digital', 'baking'],
    specs: {
      Capacity: '10 kg',
      Accuracy: '1 g',
      Display: 'Backlit LCD',
      Power: '2 × AAA (included)',
      Warranty: '6 months',
    },
    ratingAvg: 4.2,
    ratingCount: 73,
    soldCount: 330,
    addedDaysAgo: 42,
  },

  // ---- home comfort -------------------------------------------------------
  {
    sku: 'TE-HOM-2201',
    slug: 'breezo-rechargeable-table-fan',
    name: 'Breezo 12-inch Rechargeable Table Fan',
    nameTa: 'ப்ரீஸோ 12 அங்குல ரீசார்ஜபிள் மேசை மின்விசிறி',
    description:
      'Runs up to nine hours on battery, so the fan keeps going through a power cut. Three speeds, adjustable tilt and a built-in LED light.',
    descriptionTa:
      'பேட்டரியில் 9 மணி நேரம் வரை இயங்கும் — மின்வெட்டிலும் காற்று நிற்காது. மூன்று வேகங்கள், சாய்வு அமைப்பு மற்றும் உள்ளமைந்த LED விளக்கு.',
    brand: 'Breezo',
    price: 2299,
    mrp: 3799,
    stock: 29,
    categorySlug: 'home-comfort',
    tags: ['fan', 'rechargeable', 'power cut', 'summer', 'home'],
    specs: {
      Size: '12 inch blade',
      'Battery backup': 'Up to 9 hours',
      Speeds: '3',
      Extras: 'LED light, USB charging',
      Warranty: '1 year',
    },
    isFeatured: true,
    ratingAvg: 4.4,
    ratingCount: 126,
    soldCount: 380,
    addedDaysAgo: 36,
  },
  {
    sku: 'TE-HOM-2202',
    slug: 'breezo-1000w-dry-iron',
    name: 'Breezo 1000W Non-Stick Dry Iron',
    nameTa: 'ப்ரீஸோ 1000W நான்-ஸ்டிக் அயர்ன் பாக்ஸ்',
    description:
      'Light 1000W iron with a non-stick soleplate and adjustable thermostat — enough for daily cottons without a heavy steam station.',
    descriptionTa:
      'நான்-ஸ்டிக் அடிப்பாகம் மற்றும் சரிசெய்யக்கூடிய தெர்மோஸ்டாட் கொண்ட இலகுவான 1000W அயர்ன். தினசரி பருத்தி ஆடைகளுக்குப் போதுமானது.',
    brand: 'Breezo',
    price: 749,
    mrp: 1399,
    stock: 83,
    categorySlug: 'home-comfort',
    tags: ['iron', 'home', 'electrical', 'clothes'],
    specs: {
      Power: '1000W',
      Soleplate: 'Non-stick coated',
      Thermostat: 'Adjustable with indicator',
      'Cord length': '1.8 m',
      Warranty: '1 year',
    },
    ratingAvg: 4.0,
    ratingCount: 158,
    soldCount: 690,
    addedDaysAgo: 165,
  },
  {
    sku: 'TE-HOM-2203',
    slug: 'breezo-6-way-extension-board',
    name: 'Breezo 6-Way Extension Board with Surge Protection',
    nameTa: 'ப்ரீஸோ 6-வழி எக்ஸ்டென்ஷன் போர்டு (சர்ஜ் பாதுகாப்புடன்)',
    description:
      'Six universal sockets, two USB ports, individual switches and a surge protector — sized for a TV unit or a study table.',
    descriptionTa:
      'ஆறு சாக்கெட்டுகள், இரண்டு USB போர்ட்கள், தனித்தனி சுவிட்சுகள் மற்றும் சர்ஜ் பாதுகாப்பு. டிவி யூனிட் அல்லது படிப்பு மேசைக்கு ஏற்றது.',
    brand: 'Breezo',
    price: 899,
    mrp: 1499,
    stock: 94,
    categorySlug: 'home-comfort',
    tags: ['extension board', 'surge protection', 'usb', 'electrical'],
    specs: {
      Sockets: '6 universal',
      USB: '2 ports, 2.4A total',
      Protection: 'Surge and overload',
      'Cord length': '2.5 m',
      Warranty: '1 year',
    },
    ratingAvg: 4.3,
    ratingCount: 111,
    soldCount: 560,
    addedDaysAgo: 128,
  },
];

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export interface CouponSeed {
  code: string;
  description: string;
  type: 'PERCENT' | 'FLAT';
  /** Whole percent for PERCENT, rupees for FLAT. */
  value: number;
  /** Rupees. */
  minOrder: number;
  /** Rupees. */
  maxDiscount?: number;
  usageLimit?: number;
}

export const COUPON_SEED: CouponSeed[] = [
  {
    code: 'WELCOME10',
    description: '10% off your first order, up to ₹200',
    type: 'PERCENT',
    value: 10,
    minOrder: 499,
    maxDiscount: 200,
  },
  {
    code: 'GIFT100',
    description: '₹100 off return gift orders above ₹1,499',
    type: 'FLAT',
    value: 100,
    minOrder: 1499,
  },
  {
    code: 'FESTIVE15',
    description: 'Festival offer: 15% off above ₹1,999, up to ₹500',
    type: 'PERCENT',
    value: 15,
    minOrder: 1999,
    maxDiscount: 500,
    usageLimit: 500,
  },
];

// ---------------------------------------------------------------------------
// Reviews (demo)
// ---------------------------------------------------------------------------

export interface ReviewSeed {
  productSlug: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  daysAgo: number;
}

export const REVIEW_SEED: ReviewSeed[] = [
  {
    productSlug: 'volton-33w-fast-charger',
    authorName: 'Karthik R.',
    rating: 5,
    title: 'Charges really fast',
    comment:
      'Ordered on Monday, received on Wednesday in Madurai. Phone goes from 10% to 60% in about 25 minutes. The cable in the box is good quality too.',
    daysAgo: 12,
  },
  {
    productSlug: 'volton-33w-fast-charger',
    authorName: 'Priya S.',
    rating: 4,
    title: 'Good, slightly warm',
    comment:
      'Works well and the price is much better than the service centre. It gets a little warm during fast charging, which the shop told me is normal.',
    daysAgo: 30,
  },
  {
    productSlug: 'sonix-buds-pro-tws',
    authorName: 'Dinesh K.',
    rating: 4,
    title: 'Good sound for the price',
    comment:
      'Bass is decent and calls are clear even on the bike. Battery easily lasts three days with about an hour of use each day.',
    daysAgo: 8,
  },
  {
    productSlug: 'mini-led-torch-keychain-set-of-12',
    authorName: 'Lakshmi V.',
    rating: 5,
    title: 'Perfect for my son’s birthday',
    comment:
      'Took these for a class party. Each one came in its own box so we just handed them out at the door. Children were very happy with the light.',
    daysAgo: 19,
  },
  {
    productSlug: 'brass-kuthu-vilakku-set-of-10',
    authorName: 'Meena Sundaram',
    rating: 5,
    title: 'Elders were very pleased',
    comment:
      'Ordered for my daughter’s wedding thamboolam. The brass finish is proper and the velvet pouches look rich. Delivered two days before the muhurtham as promised.',
    daysAgo: 41,
  },
  {
    productSlug: 'voltcell-10000mah-power-bank',
    authorName: 'Arun P.',
    rating: 4,
    title: 'Slim and reliable',
    comment:
      'Fits in the shirt pocket. Gives about two full charges for my phone. The percentage display is much better than guessing from four dots.',
    daysAgo: 25,
  },
  {
    productSlug: 'breezo-rechargeable-table-fan',
    authorName: 'Saravanan M.',
    rating: 5,
    title: 'Saved us during a long power cut',
    comment:
      'We had a six hour power cut last week and the fan ran the whole time. The LED light was an unexpected bonus.',
    daysAgo: 6,
  },
  {
    productSlug: 'lumina-9w-led-bulb-pack-of-4',
    authorName: 'Ravi Chandran',
    rating: 4,
    title: 'Steady light',
    comment:
      'Our street has bad voltage in the evening and these do not flicker like the old bulbs. Four for this price is fair.',
    daysAgo: 52,
  },
  {
    productSlug: 'sonix-boom-12w-portable-speaker',
    authorName: 'Nithya B.',
    rating: 5,
    title: 'Loud for its size',
    comment:
      'Used it for a small terrace get-together and it filled the space. Charged once and it lasted the whole evening.',
    daysAgo: 15,
  },
  {
    productSlug: 'pulse-fit-smart-watch',
    authorName: 'Vignesh T.',
    rating: 4,
    title: 'Great value',
    comment:
      'Calling works well and step count is close to my phone. Battery lasts five days for me, not seven, but that is still good.',
    daysAgo: 22,
  },
];
