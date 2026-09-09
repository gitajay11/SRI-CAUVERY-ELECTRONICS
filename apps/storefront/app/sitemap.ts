import type { MetadataRoute } from 'next';
import { getRepository } from '@/services/repository';
import { absoluteUrl } from '@/lib/seo';

/**
 * XML sitemap.
 *
 * Lists the pages worth indexing: the home page, the shop grid, every
 * category, every active product, and the information pages. Filtered grids,
 * search results and anything behind a sign-in are deliberately excluded.
 *
 * Generated per request rather than at build time: a deploy pipeline should
 * not need a live database connection just to emit a sitemap, and the file
 * should not go stale between deploys.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getRepository();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/shop'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    {
      url: absoluteUrl('/categories'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    { url: absoluteUrl('/about'), changeFrequency: 'yearly', priority: 0.5 },
    { url: absoluteUrl('/contact'), changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/privacy-policy'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/returns-policy'), changeFrequency: 'yearly', priority: 0.4 },
    { url: absoluteUrl('/shipping-policy'), changeFrequency: 'yearly', priority: 0.4 },
  ];

  try {
    const [categories, products] = await Promise.all([
      repo.listCategoriesFlat(),
      // A single large page is fine for a shop of this size; split into a
      // sitemap index if the catalogue ever passes ~10,000 products.
      repo.searchProducts({ pageSize: 60, page: 1 }),
    ]);

    const allProducts = [...products.items];
    for (let page = 2; page <= products.totalPages && page <= 50; page += 1) {
      const next = await repo.searchProducts({ pageSize: 60, page });
      allProducts.push(...next.items);
    }

    return [
      ...staticEntries,
      ...categories.map((category) => ({
        url: absoluteUrl(`/categories/${category.slug}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...allProducts.map((product) => ({
        url: absoluteUrl(`/product/${product.slug}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    // A database hiccup should degrade the sitemap, not break the build.
    console.error('[sitemap] could not list catalogue', error);
    return staticEntries;
  }
}
