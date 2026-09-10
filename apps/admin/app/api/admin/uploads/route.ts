import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { AppError, created, handleRouteError } from '@tamizh/core/api';
import { requireAnyPermission } from '@/lib/session';
import { storage } from '@/lib/env';
import { recordAudit } from '@/lib/audit';

/**
 * POST /api/admin/uploads — accept one product image.
 *
 * Two destinations, chosen by `storage.provider`. In development the file is
 * written into the storefront's public folder, so the shop serves it with no
 * further setup. In production it goes to Vercel Blob, because a serverless
 * filesystem is read-only and the two applications are separate deployments —
 * there is no storefront folder for the admin to write into.
 *
 * Validation happens once, before either path: the same size limit, the same
 * allow list, the same magic-byte sniff. Only the write differs.
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

    if (storage.provider === 'blob' && !storage.blobToken()) {
      throw new AppError(
        'Image storage is not connected. Add a Vercel Blob store to this project.',
        503,
        'storage_unconfigured',
        { file: 'The image was not saved.' },
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
    const maxBytes = storage.maxBytes();
    if (file.size > maxBytes) {
      // One decimal, because the real ceiling on Blob is 4.5 MB and rounding
      // it to "5 MB" would tell someone their 4.8 MB photo is under the limit.
      const limit = (maxBytes / 1024 / 1024).toFixed(1).replace(/.0$/, '');
      throw new AppError(
        `Images must be under ${limit} MB.`,
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

    let url: string;

    if (storage.provider === 'blob') {
      try {
        // `addRandomSuffix: false` because the name above is already unique
        // and unguessable; letting the SDK add another makes the stored path
        // differ from what the audit entry recorded.
        const result = await put(`products/${name}`, Buffer.from(bytes), {
          access: 'public',
          contentType: type!,
          addRandomSuffix: false,
          token: storage.blobToken(),
        });
        url = result.url;
      } catch (cause) {
        console.error('[uploads] blob upload failed', cause);
        throw new AppError(
          'The image could not be stored. Try again in a moment.',
          502,
          'storage_failed',
          { file: 'The image was not saved.' },
        );
      }
    } else {
      // `turbopackIgnore` keeps the bundler from tracing the whole project
      // into the server bundle just because this path is computed at runtime.
      const directory = path.resolve(
        /* turbopackIgnore: true */ process.cwd(),
        storage.localDir(),
      );

      try {
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, name), bytes);
      } catch (cause) {
        // A read-only or ephemeral filesystem — every serverless host has one.
        // Refusing here is the point: a "saved" image that quietly disappears
        // on the next deploy is worse than an upload that plainly failed.
        console.error('[uploads] could not write to local storage', cause);
        throw new AppError(
          'This server cannot store uploaded images. Connect a Vercel Blob store, or point STORAGE_LOCAL_DIR at a writable folder.',
          503,
          'storage_unwritable',
          { file: 'The image was not saved.' },
        );
      }

      url = `${storage.publicPrefix()}/${name}`;
    }

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
