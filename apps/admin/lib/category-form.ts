/**
 * The shape the category editor works in — strings, because that is what an
 * `<input>` holds. Kept out of the client component so a server page can build
 * the blank case without importing the form's bundle.
 */
export interface CategoryFormValues {
  id?: string;
  slug: string;
  name: string;
  nameTa: string;
  description: string;
  descriptionTa: string;
  icon: string;
  imageUrl: string;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
}

export function emptyCategory(): CategoryFormValues {
  return {
    slug: '',
    name: '',
    nameTa: '',
    description: '',
    descriptionTa: '',
    icon: '',
    imageUrl: '',
    parentId: '',
    sortOrder: '0',
    isActive: true,
  };
}
