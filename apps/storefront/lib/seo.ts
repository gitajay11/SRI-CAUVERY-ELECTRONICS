import type { Metadata } from 'next';
import type { ProductDetailView } from '@tamizh/core/types';
import { siteUrl } from './env';
import { shopConfig, formattedAddress } from './site';
import { paiseToRupees } from '@tamizh/core/money';

/**
 * Metadata and structured data.
 *
 * Titles carry both names — "… | Sri Cauvery Electronics | ஸ்ரீ காவேரி மின்னணுவியல்" —
 * so the shop is findable by either script in search results.
 */

export const SITE_TITLE = 'Sri Cauvery Electronics | ஸ்ரீ காவேரி மின்னணுவியல்';
export const SITE_DESCRIPTION =
  'Electronics, mobile accessories and return gifts for weddings, birthdays and every family function. Shop online with fast delivery across Tamil Nadu, cash on delivery and 7-day easy returns.';

export function absoluteUrl(path = '/'): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Page metadata with canonical URL and social cards filled in. */
export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = '/',
  image = '/brand/og-image.png',
  noIndex = false,
  type = 'website',
}: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
}): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = title === SITE_TITLE ? title : `${title} | ${SITE_TITLE}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type,
      url,
      siteName: shopConfig.nameEn,
      title: fullTitle,
      description,
      locale: 'en_IN',
      alternateLocale: ['ta_IN'],
      images: [
        {
          url: absoluteUrl(image),
          width: 1200,
          height: 630,
          alt: `${shopConfig.nameEn} — ${shopConfig.nameTa}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [absoluteUrl(image)],
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

export function organizationJsonLd() {
  const { address } = shopConfig;
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${siteUrl()}/#organization`,
    name: shopConfig.nameEn,
    alternateName: shopConfig.nameTa,
    description: SITE_DESCRIPTION,
    url: siteUrl(),
    logo: absoluteUrl('/icons/icon-512.png'),
    image: absoluteUrl('/brand/og-image.png'),
    telephone: shopConfig.supportPhone,
    email: shopConfig.supportEmail,
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash on Delivery, UPI, Credit Card, Debit Card, Net Banking',
    foundingDate: String(shopConfig.foundedYear),
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${address.line1}, ${address.line2}`,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.pincode,
      addressCountry: 'IN',
    },
    areaServed: { '@type': 'State', name: 'Tamil Nadu' },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ],
        opens: '09:30',
        closes: '20:30',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Sunday',
        opens: '10:00',
        closes: '14:00',
      },
    ],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl()}/#website`,
    url: siteUrl(),
    name: shopConfig.nameEn,
    alternateName: shopConfig.nameTa,
    inLanguage: ['en-IN', 'ta-IN'],
    publisher: { '@id': `${siteUrl()}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl()}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function productJsonLd(product: ProductDetailView) {
  const inStock = product.stock > 0;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    alternateName: product.nameTa ?? undefined,
    description: product.description,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand },
    category: product.categoryName,
    image: product.images.map((image) => absoluteUrl(image.url)),
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: 'INR',
      price: paiseToRupees(product.price).toFixed(2),
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${siteUrl()}/#organization` },
      priceValidUntil: new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10),
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAvg.toFixed(1),
            reviewCount: product.ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(product.reviews.length > 0
      ? {
          review: product.reviews.slice(0, 5).map((review) => ({
            '@type': 'Review',
            reviewRating: {
              '@type': 'Rating',
              ratingValue: review.rating,
              bestRating: 5,
            },
            author: { '@type': 'Person', name: review.authorName },
            datePublished: review.createdAt.slice(0, 10),
            reviewBody: review.comment,
          })),
        }
      : {}),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function localBusinessAddressText(): string {
  return formattedAddress();
}
