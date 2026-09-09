import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { AppError, created, handleRouteError } from '@tamizh/core/api';
import { requireAnyPermission } from '@/lib/session';
import { storage } from '@/lib/env';
import { recordAudit } from '@/lib/audit';

/**
 * POST /api/admin/uploads — accept one product image.
 *
 * Files are written into the storefront's public folder so the shop serves
 * them directly; the database only ever stores the root-relative path.
 *
 * The filename is generated here and never taken from the upload: a browser
 * can send `../../.env` as a filename, and honouring it would let a member of
 * staff write anywhere on the disk. The extension comes from a fixed allow
 * list keyed on the sniffed content type, not on what the client claimed.
 */

const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** Magic bytes, so a renamed executable cannot pass as a PNG. */
function sniff(bytes: Uint8Array): string | null {
  const starts = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (starts(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';

  const ascii = (offset: number, text: string) =>
    [...text].every((character, index) => bytes[offset + index] === character.charCodeAt(0));

  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'image/webp';
  if (ascii(4, 'ftyp') && (ascii(8, 'avif') || ascii(8, 'avis'))) return 'image/avif';
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requireAnyPermission(
      'products.create',
      'products.update',
      'content.manage',
    );

    if (storage.provider !== 'local') {
      throw new AppError(
        'Object-storage uploads are not configured on this server.',
        501,
        'storage_unavailable',
      );
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) {
      throw new AppError('Choose an image to upload.', 422, 'no_file', {
        file: 'No file was received.',
      });
    }
    if (file.size === 0) {
      throw new AppError('That file is empty.', 422, 'empty_file');
    }
    if (file.size > storage.maxBytes) {
      throw new AppError(
        `Images must be under ${Math.round(storage.maxBytes / 1024 / 1024)} MB.`,
        413,
        'file_too_large',
        { file: 'This image is too large.' },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniff(bytes);
    const extension = type ? ALLOWED[type] : undefined;
    if (!extension) {
      throw new AppError(
        'Only PNG, JPEG, WebP and AVIF images can be uploaded.',
        415,
        'unsupported_type',
        { file: 'That file is not an image we accept.' },
      );
    }

    const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${extension}`;
    const directory = path.resolve(process.cwd(), storage.localDir());
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, name), bytes);

    const url = `${storage.publicPrefix()}/${name}`;

    await recordAudit(identity, {
      action: 'media.uploaded',
      entityType: 'Media',
      entityId: name,
      summary: `Uploaded ${url} (${Math.round(file.size / 1024)} KB)`,
    });

    return created({ url, bytes: file.size });
  } catch (error) {
    return handleRouteError(error);
  }
}
