/**
 * Product artwork glyphs.
 *
 * Each glyph draws into a 0–100 square that the caller has already translated
 * and scaled, so the same shape works for an 800px product shot and a 64px
 * category chip. `ink` is the main colour, `accent` the highlight.
 */

/** Maps a glyph drawing into an arbitrary box on the canvas. */
export function inBox(canvas, x, y, size) {
  const map = (v) => x + (v / 100) * size;
  const mapY = (v) => y + (v / 100) * size;
  return {
    rect: (rx, ry, rw, rh, c, a) =>
      canvas.fillRect(map(rx), mapY(ry), (rw / 100) * size, (rh / 100) * size, c, a),
    round: (rx, ry, rw, rh, rr, c, a) =>
      canvas.fillRoundRect(
        map(rx),
        mapY(ry),
        (rw / 100) * size,
        (rh / 100) * size,
        (rr / 100) * size,
        c,
        a,
      ),
    circle: (cx, cy, r, c, a) =>
      canvas.fillCircle(map(cx), mapY(cy), (r / 100) * size, c, a),
    ellipse: (cx, cy, rx, ry, c, a) =>
      canvas.fillEllipse(map(cx), mapY(cy), (rx / 100) * size, (ry / 100) * size, c, a),
    ring: (cx, cy, r, w, c, a) =>
      canvas.strokeCircle(map(cx), mapY(cy), (r / 100) * size, (w / 100) * size, c, a),
    line: (x0, y0, x1, y1, w, c, a) =>
      canvas.line(map(x0), mapY(y0), map(x1), mapY(y1), (w / 100) * size, c, a),
    poly: (points, c, a) =>
      canvas.fillPolygon(
        points.map(([px, py]) => [map(px), mapY(py)]),
        c,
        a,
      ),
  };
}

const shade = (c) => [c[0] * 0.78, c[1] * 0.78, c[2] * 0.78];

/** Lamp flames always read warm, whatever the category tint is. */
const FLAME = [240, 165, 0];

/**
 * @type {Record<string, (g: ReturnType<typeof inBox>, ink: number[], accent: number[], light: number[]) => void>}
 */
export const GLYPHS = {
  bolt(g, ink, accent) {
    g.round(24, 8, 52, 84, 12, ink);
    g.poly(
      [
        [60, 20],
        [34, 53],
        [48, 53],
        [42, 80],
        [66, 47],
        [52, 47],
      ],
      accent,
    );
  },

  charger(g, ink, accent) {
    g.round(26, 14, 48, 52, 12, ink);
    g.rect(38, 66, 8, 16, shade(ink));
    g.rect(54, 66, 8, 16, shade(ink));
    g.round(36, 30, 28, 8, 4, accent);
  },

  cable(g, ink, accent) {
    g.round(20, 16, 20, 26, 6, ink);
    g.rect(26, 10, 4, 8, shade(ink));
    g.rect(32, 10, 4, 8, shade(ink));
    g.line(30, 42, 30, 58, 6, ink);
    g.line(30, 58, 70, 74, 6, ink);
    g.round(62, 62, 22, 26, 7, accent);
    g.rect(70, 56, 6, 8, shade(accent));
  },

  headphones(g, ink, accent) {
    g.ring(50, 52, 28, 9, ink);
    g.rect(14, 52, 72, 30, [0, 0, 0], 0);
    g.round(16, 48, 18, 34, 8, ink);
    g.round(66, 48, 18, 34, 8, ink);
    g.round(20, 54, 10, 22, 5, accent);
    g.round(70, 54, 10, 22, 5, accent);
  },

  speaker(g, ink, accent) {
    g.round(26, 12, 48, 76, 12, ink);
    g.circle(50, 38, 13, shade(ink));
    g.circle(50, 38, 7, accent);
    g.circle(50, 66, 9, shade(ink));
    g.circle(50, 66, 4.5, accent);
  },

  battery(g, ink, accent) {
    g.round(30, 14, 40, 74, 10, ink);
    g.rect(43, 8, 14, 8, ink);
    g.round(36, 46, 28, 34, 6, accent);
    g.poly(
      [
        [58, 22],
        [38, 48],
        [50, 48],
        [44, 72],
        [64, 44],
        [52, 44],
      ],
      accent,
    );
  },

  bulb(g, ink, accent) {
    g.circle(50, 42, 26, accent);
    g.round(40, 62, 20, 10, 4, ink);
    g.round(42, 72, 16, 8, 4, shade(ink));
    g.rect(44, 80, 12, 6, shade(ink));
    g.line(50, 30, 50, 52, 4, ink, 0.5);
  },

  watch(g, ink, accent) {
    g.round(34, 6, 32, 20, 8, shade(ink));
    g.round(34, 74, 32, 20, 8, shade(ink));
    g.round(28, 22, 44, 56, 14, ink);
    g.round(34, 28, 32, 44, 10, accent);
    g.line(50, 40, 50, 52, 3.5, ink);
    g.line(50, 52, 60, 56, 3.5, ink);
  },

  phone(g, ink, accent) {
    g.round(30, 8, 40, 84, 10, ink);
    g.round(35, 18, 30, 60, 4, accent);
    g.round(44, 82, 12, 4, 2, shade(ink));
    g.circle(50, 13, 2.5, shade(ink));
  },

  gift(g, ink, accent) {
    g.round(20, 40, 60, 46, 8, ink);
    g.round(16, 30, 68, 16, 5, accent);
    g.rect(44, 30, 12, 56, shade(accent));
    g.circle(40, 22, 11, accent);
    g.circle(60, 22, 11, accent);
    g.circle(50, 24, 8, ink);
  },

  lamp(g, ink) {
    // kuthu vilakku silhouette
    g.poly(
      [
        [50, 6],
        [57, 26],
        [43, 26],
      ],
      FLAME,
    );
    g.circle(50, 22, 6, FLAME, 0.55);
    g.ellipse(50, 32, 22, 9, ink);
    g.poly(
      [
        [40, 34],
        [60, 34],
        [56, 62],
        [44, 62],
      ],
      ink,
    );
    g.ellipse(50, 66, 10, 5, shade(ink));
    g.poly(
      [
        [32, 88],
        [68, 88],
        [60, 68],
        [40, 68],
      ],
      ink,
    );
    g.ellipse(50, 88, 20, 6, shade(ink));
  },

  diya(g, ink) {
    g.poly(
      [
        [50, 16],
        [57, 40],
        [43, 40],
      ],
      FLAME,
    );
    g.circle(50, 34, 8, FLAME);
    g.circle(50, 32, 13, FLAME, 0.28);
    g.poly(
      [
        [22, 52],
        [78, 52],
        [66, 80],
        [34, 80],
      ],
      ink,
    );
    g.ellipse(50, 52, 28, 8, shade(ink));
    g.ellipse(50, 80, 16, 5, shade(ink));
  },

  cake(g, ink, accent) {
    g.line(50, 12, 50, 24, 3, accent);
    g.circle(50, 10, 4, accent);
    g.round(24, 30, 52, 20, 6, accent);
    g.round(20, 48, 60, 34, 8, ink);
    g.rect(20, 60, 60, 5, accent);
  },

  toy(g, ink, accent) {
    g.circle(38, 34, 18, accent);
    g.circle(64, 44, 14, ink);
    g.round(24, 58, 52, 30, 10, ink);
    g.circle(38, 73, 7, accent);
    g.circle(62, 73, 7, accent);
  },

  baby(g, ink, accent) {
    g.circle(50, 36, 22, accent);
    g.circle(42, 34, 3.5, ink);
    g.circle(58, 34, 3.5, ink);
    g.ring(50, 40, 9, 3, ink);
    g.rect(30, 44, 40, 12, [0, 0, 0], 0);
    g.round(28, 62, 44, 28, 12, ink);
  },

  house(g, ink, accent) {
    g.poly(
      [
        [50, 12],
        [88, 44],
        [12, 44],
      ],
      accent,
    );
    g.rect(22, 44, 56, 44, ink);
    g.round(42, 60, 16, 28, 3, accent);
    g.round(28, 52, 12, 12, 2, accent);
    g.round(60, 52, 12, 12, 2, accent);
  },

  briefcase(g, ink, accent) {
    g.round(36, 14, 28, 14, 5, accent);
    g.rect(42, 20, 16, 8, [255, 255, 255], 0.001);
    g.round(14, 26, 72, 58, 10, ink);
    g.rect(14, 46, 72, 8, accent);
    g.round(44, 42, 12, 16, 3, accent);
  },

  kettle(g, ink, accent) {
    g.round(28, 26, 44, 54, 12, ink);
    g.round(34, 36, 10, 30, 5, accent);
    g.poly(
      [
        [72, 36],
        [86, 44],
        [86, 58],
        [72, 62],
      ],
      shade(ink),
    );
    g.round(38, 16, 24, 12, 6, accent);
    g.rect(24, 80, 52, 8, shade(ink));
  },

  fan(g, ink, accent) {
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const cx = 50 + Math.cos(a) * 22;
      const cy = 50 + Math.sin(a) * 22;
      g.ellipse(cx, cy, 17, 11, i % 2 === 0 ? ink : accent);
    }
    g.circle(50, 50, 10, ink);
    g.circle(50, 50, 4, accent);
  },

  chip(g, ink, accent) {
    g.round(24, 24, 52, 52, 10, ink);
    g.round(36, 36, 28, 28, 6, accent);
    for (let i = 0; i < 3; i += 1) {
      const p = 34 + i * 16;
      g.rect(p, 12, 6, 12, ink);
      g.rect(p, 76, 6, 12, ink);
      g.rect(12, p, 12, 6, ink);
      g.rect(76, p, 12, 6, ink);
    }
  },

  home(g, ink, accent) {
    GLYPHS.house(g, ink, accent);
  },

  bottle(g, ink, accent) {
    g.round(42, 8, 16, 14, 4, shade(ink));
    g.round(38, 20, 24, 10, 4, accent);
    g.round(32, 28, 36, 60, 12, ink);
    g.round(38, 44, 24, 26, 6, accent);
  },

  container(g, ink, accent) {
    g.round(22, 34, 56, 50, 10, ink);
    g.round(18, 24, 64, 14, 6, accent);
    g.rect(30, 48, 40, 6, accent);
  },

  pen(g, ink, accent) {
    g.poly(
      [
        [24, 80],
        [30, 62],
        [70, 18],
        [80, 28],
        [40, 72],
      ],
      ink,
    );
    g.poly(
      [
        [24, 80],
        [30, 62],
        [36, 68],
      ],
      accent,
    );
    g.line(64, 24, 74, 34, 5, accent);
  },

  scale(g, ink, accent) {
    g.round(16, 34, 68, 46, 10, ink);
    g.round(28, 44, 44, 20, 5, accent);
    g.rect(30, 22, 40, 12, shade(ink));
  },

  balloon(g, ink, accent) {
    g.ellipse(38, 34, 18, 22, accent);
    g.ellipse(64, 44, 15, 19, ink);
    g.line(38, 56, 34, 86, 2.5, ink);
    g.line(64, 63, 68, 86, 2.5, accent);
  },

  pencilbox(g, ink, accent) {
    g.round(16, 32, 68, 44, 8, ink);
    g.rect(16, 46, 68, 6, accent);
    g.round(24, 18, 10, 16, 3, accent);
    g.round(40, 14, 10, 20, 3, accent);
    g.round(56, 20, 10, 14, 3, accent);
  },

  puzzle(g, ink, accent) {
    g.round(18, 18, 34, 34, 6, ink);
    g.round(52, 18, 30, 34, 6, accent);
    g.round(18, 52, 34, 30, 6, accent);
    g.round(52, 52, 30, 30, 6, ink);
    g.circle(50, 35, 7, accent);
    g.circle(50, 67, 7, ink);
  },

  thali(g, ink, accent) {
    g.ellipse(50, 58, 36, 24, ink);
    g.ellipse(50, 54, 28, 18, accent);
    g.circle(38, 52, 6, ink);
    g.circle(58, 50, 5, ink);
    g.poly(
      [
        [50, 20],
        [55, 36],
        [45, 36],
      ],
      accent,
    );
  },

  pot(g, ink, accent) {
    g.poly(
      [
        [26, 42],
        [74, 42],
        [68, 84],
        [32, 84],
      ],
      ink,
    );
    g.ellipse(50, 42, 24, 8, accent);
    g.rect(28, 52, 44, 7, accent);
    g.poly(
      [
        [50, 18],
        [56, 36],
        [44, 36],
      ],
      accent,
    );
  },

  iron(g, ink, accent) {
    g.poly(
      [
        [16, 70],
        [84, 62],
        [84, 76],
        [16, 80],
      ],
      ink,
    );
    g.round(24, 40, 52, 26, 12, accent);
    g.round(34, 28, 32, 14, 7, ink);
  },

  socket(g, ink, accent) {
    g.round(14, 34, 72, 32, 10, ink);
    g.circle(32, 50, 8, accent);
    g.circle(52, 50, 8, accent);
    g.round(66, 44, 12, 12, 3, accent);
  },

  keychain(g, ink, accent) {
    g.ring(34, 26, 14, 5, accent);
    g.round(44, 36, 18, 50, 8, ink);
    g.circle(53, 80, 5, accent);
  },

  nameplate(g, ink, accent) {
    g.round(12, 30, 76, 40, 8, ink);
    g.rect(22, 44, 56, 6, accent);
    g.rect(22, 56, 36, 6, accent);
    g.circle(20, 26, 4, accent);
    g.circle(80, 26, 4, accent);
  },

  hamper(g, ink, accent) {
    g.poly(
      [
        [18, 44],
        [82, 44],
        [74, 86],
        [26, 86],
      ],
      ink,
    );
    g.rect(16, 40, 68, 8, accent);
    g.circle(36, 30, 11, accent);
    g.circle(56, 26, 13, accent);
    g.circle(68, 34, 9, accent);
  },

  lampsmall(g, ink, accent) {
    g.round(36, 46, 28, 36, 10, ink);
    g.circle(50, 34, 16, accent);
    g.rect(30, 80, 40, 8, shade(ink));
  },

  mount(g, ink, accent) {
    g.round(34, 12, 32, 52, 6, accent);
    g.round(40, 64, 20, 8, 3, ink);
    g.round(28, 72, 44, 14, 6, ink);
  },

  glass(g, ink, accent) {
    g.round(28, 10, 44, 80, 8, accent);
    g.round(34, 18, 32, 64, 5, ink, 0.35);
    g.poly(
      [
        [36, 20],
        [50, 20],
        [40, 78],
        [34, 78],
      ],
      [255, 255, 255],
      0.35,
    );
  },

  stand(g, ink, accent) {
    g.poly(
      [
        [22, 82],
        [52, 82],
        [72, 26],
        [58, 22],
      ],
      ink,
    );
    g.round(18, 78, 46, 10, 5, accent);
    g.round(56, 20, 20, 10, 5, accent);
  },

  tracker(g, ink, accent) {
    g.round(26, 26, 48, 48, 14, ink);
    g.circle(50, 50, 12, accent);
    g.ring(50, 50, 20, 3, accent, 0.5);
    g.circle(50, 20, 4, accent);
  },

  blender(g, ink, accent) {
    g.round(40, 8, 20, 40, 8, ink);
    g.round(36, 46, 28, 20, 8, accent);
    g.poly(
      [
        [44, 66],
        [56, 66],
        [54, 88],
        [46, 88],
      ],
      ink,
    );
    g.ellipse(50, 88, 12, 5, accent);
  },
};

/** Chooses a glyph for a product from its category and tags. */
export function glyphForProduct(categorySlug, tags, slug) {
  const has = (needle) => tags.some((t) => t.includes(needle)) || slug.includes(needle);

  if (has('car mount') || has('mount')) return 'mount';
  if (has('screen guard') || has('tempered')) return 'glass';
  if (has('stand')) return 'stand';
  if (has('tracker')) return 'tracker';
  if (has('blender')) return 'blender';
  if (has('kettle')) return 'kettle';
  if (has('scale')) return 'scale';
  if (has('iron')) return 'iron';
  if (has('extension')) return 'socket';
  if (has('keychain')) return 'keychain';
  if (has('nameplate')) return 'nameplate';
  if (has('balloon')) return 'balloon';
  if (has('stationery') || has('pencil')) return 'pencilbox';
  if (has('puzzle') || has('activity') || has('colouring')) return 'puzzle';
  if (has('thali') || has('pooja')) return 'thali';
  if (has('clay pot') || has('pongal')) return 'pot';
  if (has('diya') || has('deepavali')) return 'diya';
  if (has('vilakku') || has('lamp')) return has('night lamp') ? 'lampsmall' : 'lamp';
  if (has('bottle') || has('flask')) return 'bottle';
  if (has('container')) return 'container';
  if (has('bangle')) return 'thali';
  if (has('desk') && has('corporate')) return 'pen';
  if (has('hamper')) return 'hamper';
  if (has('wooden')) return 'puzzle';

  switch (categorySlug) {
    case 'chargers':
      return has('car charger') ? 'charger' : 'bolt';
    case 'cables':
      return 'cable';
    case 'earphones':
      return 'headphones';
    case 'bluetooth-speakers':
      return 'speaker';
    case 'power-banks':
      return 'battery';
    case 'led-lighting':
      return 'bulb';
    case 'gadgets':
      return has('fan') ? 'fan' : 'watch';
    case 'mobile-accessories':
      return 'phone';
    case 'kitchen-gadgets':
      return 'kettle';
    case 'home-comfort':
      return 'fan';
    default:
      return 'gift';
  }
}
