#!/usr/bin/env node
/**
 * Generates every raster asset the shop ships:
 *
 *   public/brand/*        Open Graph / social card
 *   public/products/*     two shots per catalogue product
 *
 * Run with `npm run assets`. The output is deterministic, so re-running only
 * rewrites files when the catalogue or the artwork code changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Canvas, hex, lighten, darken, mix } from './lib/raster.mjs';
import { GLYPHS, glyphForProduct, inBox } from './lib/glyphs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Per-category tint so a grid of products reads as a set, not a jumble. */
const CATEGORY_TINT = {
  chargers: ['#e8f4f2', '#0d7c74'],
  cables: ['#e9f1f7', '#1f6f9c'],
  earphones: ['#efeaf7', '#5b46a8'],
  'bluetooth-speakers': ['#fdeeea', '#c0492b'],
  'power-banks': ['#e8f3ec', '#2f7d4f'],
  'led-lighting': ['#fdf4e3', '#c98a05'],
  gadgets: ['#eaeef7', '#3a55a5'],
  'mobile-accessories': ['#eef2f5', '#42606f'],
  'birthday-return-gifts': ['#fdeef4', '#c33d76'],
  'wedding-return-gifts': ['#fbf1e2', '#a8712a'],
  'kids-return-gifts': ['#eaf6f1', '#1f8a6a'],
  'baby-shower-gifts': ['#fdf0ec', '#cf6a52'],
  'housewarming-gifts': ['#f1f1ea', '#6b7a3a'],
  'festival-gifts': ['#fdefe0', '#cd6a10'],
  'corporate-gifts': ['#edeef2', '#4a5570'],
  'kitchen-gadgets': ['#eef4ec', '#4a7c3f'],
  'home-comfort': ['#eaf2f6', '#2e6b88'],
};

function tintFor(slug) {
  const pair = CATEGORY_TINT[slug] ?? ['#eef2f2', '#0d7c74'];
  return { bg: hex(pair[0]), ink: hex(pair[1]) };
}

function write(relative, buffer) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const existing = fs.existsSync(target) ? fs.readFileSync(target) : null;
  if (existing && existing.equals(buffer)) return false;
  fs.writeFileSync(target, buffer);
  return true;
}

// ---------------------------------------------------------------------------
// Product shots
// ---------------------------------------------------------------------------

/**
 * @param {{slug: string, categorySlug: string, tags: string[]}} product
 * @param {number} variant 0 = straight-on hero shot, 1 = angled alternate
 */
function productImage(product, variant, size = 800) {
  const { bg, ink } = tintFor(product.categorySlug);
  const accent = variant === 0 ? lighten(ink, 0.55) : lighten(ink, 0.35);
  const canvas = new Canvas(size, size);

  if (variant === 0) {
    canvas.linearGradient(lighten(bg, 0.45), bg, Math.PI / 2.2);
    canvas.radialGlow(size * 0.5, size * 0.42, size * 0.46, [255, 255, 255], 0.75);
  } else {
    canvas.linearGradient(bg, mix(bg, ink, 0.14), Math.PI / 1.6);
    canvas.radialGlow(size * 0.62, size * 0.34, size * 0.5, [255, 255, 255], 0.55);
  }

  // Soft contact shadow so the product does not float.
  canvas.fillEllipse(
    size * 0.5,
    size * 0.755,
    size * 0.21,
    size * 0.032,
    darken(ink, 0.3),
    0.11,
  );

  const glyphName = glyphForProduct(product.categorySlug, product.tags, product.slug);
  const glyph = GLYPHS[glyphName] ?? GLYPHS.gift;
  const boxSize = size * (variant === 0 ? 0.52 : 0.46);
  const x = size * 0.5 - boxSize / 2 + (variant === 1 ? size * 0.03 : 0);
  const y = size * (variant === 0 ? 0.24 : 0.26);
  const g = inBox(canvas, x, y, boxSize);
  glyph(g, ink, accent, bg);

  // A thin corner rule keeps the frame from feeling empty.
  const pad = size * 0.055;
  const len = size * 0.09;
  const rule = mix(ink, bg, 0.55);
  canvas.line(pad, pad, pad + len, pad, size * 0.006, rule, 0.5);
  canvas.line(pad, pad, pad, pad + len, size * 0.006, rule, 0.5);
  canvas.line(size - pad, size - pad, size - pad - len, size - pad, size * 0.006, rule, 0.5);
  canvas.line(size - pad, size - pad, size - pad, size - pad - len, size * 0.006, rule, 0.5);

  return canvas.toPNG();
}

/** Small square used on category cards. */
function categoryImage(category, size = 400) {
  const { bg, ink } = tintFor(category.slug);
  const canvas = new Canvas(size, size);
  canvas.linearGradient(lighten(bg, 0.4), bg, Math.PI / 2.4);
  canvas.radialGlow(size * 0.5, size * 0.45, size * 0.5, [255, 255, 255], 0.6);
  const glyph = GLYPHS[category.icon] ?? GLYPHS.gift;
  const box = size * 0.5;
  glyph(inBox(canvas, size * 0.25, size * 0.24, box), ink, lighten(ink, 0.5), bg);
  return canvas.toPNG();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { PRODUCT_SEED, CATEGORY_SEED } = await import('../../../packages/db/prisma/seed-data.ts');

  let written = 0;
  const note = (changed) => {
    if (changed) written += 1;
  };

  // App icons and the share card are deliberately NOT written here any more.
  // They are cut from the shop's real logo by scripts/generate-icons.mjs at the
  // repository root; regenerating them from drawn shapes would quietly replace
  // the crest with a placeholder.

  // Category cards
  for (const category of CATEGORY_SEED) {
    note(write(`public/categories/${category.slug}.png`, categoryImage(category)));
  }

  // Product shots
  for (const product of PRODUCT_SEED) {
    note(write(`public/products/${product.slug}-1.png`, productImage(product, 0)));
    note(write(`public/products/${product.slug}-2.png`, productImage(product, 1)));
  }

  console.log(
    `Assets up to date. ${written} file(s) written for ${PRODUCT_SEED.length} products.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
