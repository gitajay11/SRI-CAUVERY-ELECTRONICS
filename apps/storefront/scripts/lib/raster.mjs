import zlib from 'node:zlib';

/**
 * A very small software rasteriser + PNG encoder.
 *
 * The shop ships its own artwork rather than pulling in an image library or
 * hot-linking stock photos: everything under public/icons and public/products
 * is produced from these primitives at build time by scripts/generate-assets.
 *
 * Everything is drawn into a supersampled RGBA buffer and box-filtered down on
 * export, which is what gives the shapes their clean edges.
 */

export const SUPERSAMPLE = 3;

export class Canvas {
  /**
   * @param {number} width  logical width in px
   * @param {number} height logical height in px
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.scale = SUPERSAMPLE;
    this.w = width * this.scale;
    this.h = height * this.scale;
    this.data = new Float32Array(this.w * this.h * 4);
  }

  /** Blends a colour into one supersampled pixel. */
  #blend(x, y, [r, g, b], alpha) {
    if (alpha <= 0 || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const a = Math.min(1, alpha);
    const inv = 1 - a;
    this.data[i] = this.data[i] * inv + r * a;
    this.data[i + 1] = this.data[i + 1] * inv + g * a;
    this.data[i + 2] = this.data[i + 2] * inv + b * a;
    this.data[i + 3] = this.data[i + 3] * inv + 255 * a;
  }

  /** Fills the whole canvas with a flat colour. */
  fill(colour) {
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) this.#blend(x, y, colour, 1);
    }
  }

  /**
   * Vertical or diagonal linear gradient across the whole canvas.
   * @param {[number,number,number]} from
   * @param {[number,number,number]} to
   * @param {number} angle in radians; 0 = left→right, PI/2 = top→bottom
   */
  linearGradient(from, to, angle = Math.PI / 2) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const project = (x, y) => x * dx + y * dy;
    const corners = [
      project(0, 0),
      project(this.w, 0),
      project(0, this.h),
      project(this.w, this.h),
    ];
    const min = Math.min(...corners);
    const max = Math.max(...corners);
    const span = max - min || 1;
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        const t = (project(x, y) - min) / span;
        this.#blend(
          x,
          y,
          [
            from[0] + (to[0] - from[0]) * t,
            from[1] + (to[1] - from[1]) * t,
            from[2] + (to[2] - from[2]) * t,
          ],
          1,
        );
      }
    }
  }

  /** Soft radial glow, used to lift the centre of product shots. */
  radialGlow(cx, cy, radius, colour, strength = 0.4) {
    const s = this.scale;
    const r = radius * s;
    const x0 = Math.max(0, Math.floor(cx * s - r));
    const x1 = Math.min(this.w, Math.ceil(cx * s + r));
    const y0 = Math.max(0, Math.floor(cy * s - r));
    const y1 = Math.min(this.h, Math.ceil(cy * s + r));
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const d = Math.hypot(x - cx * s, y - cy * s) / r;
        if (d >= 1) continue;
        // smoothstep falloff
        const t = 1 - d;
        this.#blend(x, y, colour, strength * t * t);
      }
    }
  }

  /**
   * Fills a polygon (array of [x, y] in logical px) with the non-zero rule.
   * Edge coverage is handled by the supersampling, so this is a hard fill.
   */
  fillPolygon(points, colour, alpha = 1) {
    if (points.length < 3) return;
    const s = this.scale;
    const pts = points.map(([x, y]) => [x * s, y * s]);
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const yStart = Math.max(0, Math.floor(minY));
    const yEnd = Math.min(this.h - 1, Math.ceil(maxY));
    for (let y = yStart; y <= yEnd; y += 1) {
      const centreY = y + 0.5;
      /** @type {Array<{x:number, dir:number}>} */
      const crossings = [];
      for (let i = 0; i < pts.length; i += 1) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if (a[1] === b[1]) continue;
        const [top, bottom, dir] = a[1] < b[1] ? [a, b, 1] : [b, a, -1];
        if (centreY < top[1] || centreY >= bottom[1]) continue;
        const t = (centreY - top[1]) / (bottom[1] - top[1]);
        crossings.push({ x: top[0] + (bottom[0] - top[0]) * t, dir });
      }
      if (crossings.length === 0) continue;
      crossings.sort((p, q) => p.x - q.x);
      let winding = 0;
      for (let i = 0; i < crossings.length - 1; i += 1) {
        winding += crossings[i].dir;
        if (winding === 0) continue;
        const from = Math.max(0, Math.ceil(crossings[i].x - 0.5));
        const to = Math.min(this.w - 1, Math.floor(crossings[i + 1].x - 0.5));
        for (let x = from; x <= to; x += 1) this.#blend(x, y, colour, alpha);
      }
    }
  }

  fillRect(x, y, w, h, colour, alpha = 1) {
    this.fillPolygon(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      colour,
      alpha,
    );
  }

  fillRoundRect(x, y, w, h, radius, colour, alpha = 1) {
    const r = Math.min(radius, w / 2, h / 2);
    const pts = [];
    const arc = (cx, cy, start, end) => {
      const steps = 14;
      for (let i = 0; i <= steps; i += 1) {
        const a = start + ((end - start) * i) / steps;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    arc(x + w - r, y + r, -Math.PI / 2, 0);
    arc(x + w - r, y + h - r, 0, Math.PI / 2);
    arc(x + r, y + h - r, Math.PI / 2, Math.PI);
    arc(x + r, y + r, Math.PI, (Math.PI * 3) / 2);
    this.fillPolygon(pts, colour, alpha);
  }

  fillCircle(cx, cy, r, colour, alpha = 1) {
    this.fillEllipse(cx, cy, r, r, colour, alpha);
  }

  fillEllipse(cx, cy, rx, ry, colour, alpha = 1) {
    const pts = [];
    const steps = 72;
    for (let i = 0; i < steps; i += 1) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    this.fillPolygon(pts, colour, alpha);
  }

  /** Ring outline, drawn as a strip of quads around the circumference. */
  strokeCircle(cx, cy, r, width, colour, alpha = 1) {
    const steps = 96;
    const ri = r - width / 2;
    const ro = r + width / 2;
    for (let i = 0; i < steps; i += 1) {
      const a0 = (i / steps) * Math.PI * 2;
      const a1 = ((i + 1) / steps) * Math.PI * 2;
      this.fillPolygon(
        [
          [cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri],
          [cx + Math.cos(a0) * ro, cy + Math.sin(a0) * ro],
          [cx + Math.cos(a1) * ro, cy + Math.sin(a1) * ro],
          [cx + Math.cos(a1) * ri, cy + Math.sin(a1) * ri],
        ],
        colour,
        alpha,
      );
    }
  }

  /** Thick line segment with square ends. */
  line(x0, y0, x1, y1, width, colour, alpha = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * (width / 2);
    const ny = (dx / len) * (width / 2);
    this.fillPolygon(
      [
        [x0 + nx, y0 + ny],
        [x1 + nx, y1 + ny],
        [x1 - nx, y1 - ny],
        [x0 - nx, y0 - ny],
      ],
      colour,
      alpha,
    );
  }

  /** Box-filters the supersampled buffer down to the logical size. */
  toRGBA() {
    const out = Buffer.alloc(this.width * this.height * 4);
    const s = this.scale;
    const samples = s * s;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        for (let sy = 0; sy < s; sy += 1) {
          for (let sx = 0; sx < s; sx += 1) {
            const i = ((y * s + sy) * this.w + (x * s + sx)) * 4;
            r += this.data[i];
            g += this.data[i + 1];
            b += this.data[i + 2];
            a += this.data[i + 3];
          }
        }
        const o = (y * this.width + x) * 4;
        out[o] = Math.round(r / samples);
        out[o + 1] = Math.round(g / samples);
        out[o + 2] = Math.round(b / samples);
        out[o + 3] = Math.round(a / samples);
      }
    }
    return out;
  }

  toPNG() {
    return encodePNG(this.toRGBA(), this.width, this.height);
  }
}

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = buildCrcTable());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = (crc ^ buf[i]) & 0xff;
    crc = (crc >>> 8) ^ table[c];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

/** Encodes raw RGBA bytes as a PNG using the "Paeth" filter on every row. */
export function encodePNG(rgba, width, height) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 4; // Paeth
    for (let x = 0; x < stride; x += 1) {
      const current = rgba[y * stride + x];
      const left = x >= 4 ? rgba[y * stride + x - 4] : 0;
      const up = y > 0 ? rgba[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? rgba[(y - 1) * stride + x - 4] : 0;
      raw[rowStart + 1 + x] = (current - paeth(left, up, upLeft)) & 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/** "#0f766e" -> [15, 118, 110] */
export function hex(value) {
  const v = value.replace('#', '');
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function lighten(colour, t) {
  return mix(colour, [255, 255, 255], t);
}

export function darken(colour, t) {
  return mix(colour, [0, 0, 0], t);
}
