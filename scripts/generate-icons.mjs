#!/usr/bin/env node
/**
 * Builds every app icon from the shop's logo.
 *
 *   node scripts/generate-icons.mjs
 *
 * The source is `logo/logo.jpeg` — a gold crest on a black ground. Two things
 * that image needs before it can be an app icon:
 *
 *  - **The wordmark has to go.** At 32px "SRI CAUVERY ELECTRONICS" is four grey
 *    pixels. The crest is cropped to its square, so the mark stays legible at
 *    a favicon's size.
 *  - **Maskable icons need a safe zone.** Android crops an adaptive icon to
 *    whatever shape the launcher likes — a circle, a squircle, a teardrop. The
 *    maskable variants keep the crest inside the middle 80% so nothing is
 *    clipped, and extend the black ground to the edges.
 *
 * Everything is written from the same source, so the icons cannot drift apart.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'logo', 'logo.jpeg');
const APPS = ['storefront', 'admin'];

/**
 * The crest, square, without the wordmark beneath it.
 *
 * Measured from the source rather than guessed: the artwork occupies
 * x 288–972 and y 298–968, with a clear 37px band of black between the crest
 * and the first line of type. This box is that content centred in a square,
 * plus a few percent of air.
 */
const CREST = { left: 274, top: 277, width: 712, height: 712 };

/**
 * The logo's own ground, sampled from the artwork rather than picked: the
 * source is a true black, and a near-black canvas leaves a visible seam around
 * the composited crest.
 */
const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };

const SIZES = [16, 32, 64, 96, 128, 180, 192, 256, 384, 512];
const MASKABLE = [192, 512];

/** Crest cropped square, trimmed of the wordmark. */
function crest() {
  return sharp(SOURCE).extract(CREST);
}

/** The bronze from the palette, for the admin's distinguishing bar. */
const BRONZE = { r: 0x8a, g: 0x6a, b: 0x19, alpha: 1 };

/**
 * A plain icon: the crest filling the frame with a little breathing room.
 *
 * The admin's icons carry a bronze bar along the bottom edge. Two identical
 * icons sitting next to each other on a phone home screen is a daily
 * irritation — staff have both installed, and need to hit the right one
 * without reading the label.
 */
async function icon(size, { bar = false } = {}) {
  const inner = Math.round(size * (bar ? 0.86 : 0.92));
  const barHeight = Math.max(2, Math.round(size * 0.085));

  const layers = [
    {
      input: await crest()
        .resize(inner, inner, { fit: 'contain', background: BLACK })
        .png()
        .toBuffer(),
      gravity: bar ? 'north' : 'center',
    },
  ];

  if (bar) {
    layers.push({
      input: await sharp({
        create: {
          width: Math.round(size * 0.52),
          height: barHeight,
          channels: 4,
          background: BRONZE,
        },
      })
        .png()
        .toBuffer(),
      gravity: 'south',
      top: size - barHeight * 2,
      left: Math.round(size * 0.24),
    });
  }

  return sharp({
    create: { width: size, height: size, channels: 4, background: BLACK },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** A maskable icon: the same crest, held inside the safe circle. */
async function maskable(size, { bar = false } = {}) {
  const inner = Math.round(size * 0.62);
  return sharp({
    create: { width: size, height: size, channels: 4, background: BLACK },
  })
    .composite([
      {
        input: await crest()
          .resize(inner, inner, { fit: 'contain', background: BLACK })
          .png()
          .toBuffer(),
        gravity: 'center',
      },
      ...(bar
        ? [
            {
              input: await sharp({
                create: {
                  width: Math.round(size * 0.3),
                  height: Math.max(2, Math.round(size * 0.045)),
                  channels: 4,
                  background: BRONZE,
                },
              })
                .png()
                .toBuffer(),
              gravity: 'south',
              top: Math.round(size * 0.72),
              left: Math.round(size * 0.35),
            },
          ]
        : []),
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * A classic .ico, holding 16/32/48px PNGs.
 *
 * Written by hand because the format is six fields and a directory: browsers
 * still ask for /favicon.ico, and a 404 there is a console error on every page.
 */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const directory = [];
  for (const { size, data } of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    directory.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...directory, ...entries.map((e) => e.data)]);
}

async function main() {
  for (const app of APPS) {
    const iconsDir = path.join(ROOT, 'apps', app, 'public', 'icons');
    const publicDir = path.join(ROOT, 'apps', app, 'public');
    await mkdir(iconsDir, { recursive: true });

    // One crest, both applications. The admin icons used to carry a bronze bar
    // so the two installed apps could be told apart on a phone home screen;
    // the shop would rather have a single mark used consistently everywhere,
    // so the bar is gone and the two icons are now identical.
    const bar = false;
    const written = [];

    for (const size of SIZES) {
      const data = await icon(size, { bar });
      const name =
        size === 16 || size === 32
          ? `favicon-${size}.png`
          : size === 180
            ? 'apple-touch-icon.png'
            : `icon-${size}.png`;
      await writeFile(path.join(iconsDir, name), data);
      written.push(name);
    }

    for (const size of MASKABLE) {
      await writeFile(path.join(iconsDir, `maskable-${size}.png`), await maskable(size, { bar }));
      written.push(`maskable-${size}.png`);
    }

    // The logo itself, for the sign-in screen and Open Graph.
    await writeFile(
      path.join(iconsDir, 'logo.png'),
      await crest().resize(512, 512, { fit: 'contain', background: BLACK }).png().toBuffer(),
    );
    written.push('logo.png');

    const favicon = ico(
      await Promise.all(
        [16, 32, 48].map(async (size) => ({ size, data: await icon(size, { bar }) })),
      ),
    );
    await writeFile(path.join(publicDir, 'favicon.ico'), favicon);
    written.push('favicon.ico');

    console.log(`${app.padEnd(11)} ${written.length} files`);
  }

  // Open Graph share card: the crest on black, with room around it.
  const og = await sharp({
    create: { width: 1200, height: 630, channels: 4, background: BLACK },
  })
    .composite([
      {
        input: await crest().resize(430, 430, { fit: 'contain', background: BLACK }).png().toBuffer(),
        gravity: 'center',
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  // The storefront's metadata already points at /brand/og-image.png, so the
  // card is written where the code expects to find it.
  await mkdir(path.join(ROOT, 'apps', 'storefront', 'public', 'brand'), { recursive: true });
  await writeFile(
    path.join(ROOT, 'apps', 'storefront', 'public', 'brand', 'og-image.png'),
    og,
  );
  console.log('og-image   1200x630 (storefront share card)');
}

main().catch((error) => {
  console.error('Icon generation failed:', error);
  process.exit(1);
});
