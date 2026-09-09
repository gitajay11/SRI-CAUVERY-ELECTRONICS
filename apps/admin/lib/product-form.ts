import type { ProductStatus } from '@tamizh/db/enums';

/**
 * The shape the product editor works in.
 *
 * Every field is a string because that is what an `<input>` holds; money is in
 * rupees exactly as a person typed it and is converted to paise server-side.
 *
 * This lives outside the form component so a server page can build the initial
 * values without pulling the client bundle in with them.
 */
export interface ProductFormValues {
  id?: string;
  sku: string;
  slug: string;
  name: string;
  nameTa: string;
  description: string;
  descriptionTa: string;
  brand: string;
  categoryId: string;
  /** Rupees, as typed. */
  mrp: string;
  price: string;
  costPrice: string;
  taxPercent: string;
  stock: string;
  lowStockThreshold: string;
  weightGrams: string;
  lengthMm: string;
  widthMm: string;
  heightMm: string;
  status: ProductStatus;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  tags: string;
  specs: { key: string; value: string }[];
  images: { url: string; alt: string }[];
}

/** A blank product: draft, no stock, 18% GST — the usual starting point. */
export function emptyProduct(categoryId: string): ProductFormValues {
  return {
    sku: '',
    slug: '',
    name: '',
    nameTa: '',
    description: '',
    descriptionTa: '',
    brand: '',
    categoryId,
    mrp: '',
    price: '',
    costPrice: '',
    taxPercent: '18',
    stock: '0',
    lowStockThreshold: '5',
    weightGrams: '',
    lengthMm: '',
    widthMm: '',
    heightMm: '',
    status: 'DRAFT',
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
    tags: '',
    specs: [{ key: '', value: '' }],
    images: [],
  };
}
