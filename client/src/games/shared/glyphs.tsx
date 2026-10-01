import { useId } from 'react';
import { clamp, pick, randInt, sample, type Rng } from '@/utils/rng';

export type ShapeName = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon' | 'cross' | 'moon';
export type ColorName = 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'teal';
export type FillStyle = 'solid' | 'outline' | 'striped';
export type Rotation = 0 | 90 | 180 | 270;

export interface Glyph {
  shape: ShapeName;
  color: ColorName;
  fill: FillStyle;
  rotation: Rotation;
}

export const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'cross', 'moon'];
export const COLORS: ColorName[] = ['red', 'blue', 'green', 'amber', 'purple', 'teal'];
export const FILLS: FillStyle[] = ['solid', 'outline', 'striped'];
export const ROTATIONS: Rotation[] = [0, 90, 180, 270];

/** Yalnızca dönmesi görsel fark yaratan şekiller. */
const ROTATABLE: ShapeName[] = ['triangle', 'moon'];

export const COLOR_HEX: Record<ColorName, string> = {
  red: '#e5484d',
  blue: '#3b82f6',
  green: '#1f9d6b',
  amber: '#e8a317',
  purple: '#8b5cf6',
  teal: '#0e9aa7',
};

export const COLOR_LABEL: Record<ColorName, string> = {
  red: 'Kırmızı',
  blue: 'Mavi',
  green: 'Yeşil',
  amber: 'Sarı',
  purple: 'Mor',
  teal: 'Turkuaz',
};

/** Renk körlüğü desteği için şekil üzerine konan harf. */
const COLOR_LETTER: Record<ColorName, string> = {
  red: 'K',
  blue: 'M',
  green: 'Y',
  amber: 'S',
  purple: 'P',
  teal: 'T',
};

export const SHAPE_LABEL: Record<ShapeName, string> = {
  circle: 'daire',
  square: 'kare',
  triangle: 'üçgen',
  diamond: 'baklava',
  star: 'yıldız',
  hexagon: 'altıgen',
  cross: 'artı',
  moon: 'hilal',
};

export function isRotatable(shape: ShapeName): boolean {
  return ROTATABLE.includes(shape);
}

function normalize(g: Glyph): Glyph {
  return isRotatable(g.shape) ? g : { ...g, rotation: 0 };
}

export function glyphKey(g: Glyph): string {
  const n = normalize(g);
  return `${n.shape}|${n.color}|${n.fill}|${n.rotation}`;
}

export function sameGlyph(a: Glyph, b: Glyph): boolean {
  return glyphKey(a) === glyphKey(b);
}

export function glyphLabel(g: Glyph): string {
  const fill = g.fill === 'solid' ? '' : g.fill === 'outline' ? 'içi boş ' : 'çizgili ';
  return `${COLOR_LABEL[g.color]} ${fill}${SHAPE_LABEL[g.shape]}`.toLowerCase();
}

export function randomGlyph(rng: Rng = Math.random): Glyph {
  return normalize({
    shape: pick(SHAPES, rng),
    color: pick(COLORS, rng),
    fill: pick(FILLS, rng),
    rotation: pick(ROTATIONS, rng),
  });
}

type Dim = 'shape' | 'color' | 'fill' | 'rotation';

/** Glifin tam olarak `changes` niteliğini değiştirir (mümkün olduğunca). */
export function mutateGlyph(base: Glyph, changes: number, rng: Rng = Math.random): Glyph {
  const dims: Dim[] = ['shape', 'color', 'fill'];
  if (isRotatable(base.shape)) dims.push('rotation');
  const chosen = sample(dims, clamp(changes, 1, dims.length), rng);
  const out: Glyph = { ...base };
  for (const dim of chosen) {
    if (dim === 'shape') out.shape = pick(SHAPES.filter((s) => s !== base.shape), rng);
    if (dim === 'color') out.color = pick(COLORS.filter((c) => c !== base.color), rng);
    if (dim === 'fill') out.fill = pick(FILLS.filter((f) => f !== base.fill), rng);
    if (dim === 'rotation') out.rotation = pick(ROTATIONS.filter((r) => r !== base.rotation), rng);
  }
  return normalize(out);
}

/**
 * Hedefe benzeyen, birbirinden ve hedeften farklı `count` glif üretir.
 * `similarity` 0 → çok farklı (3-4 nitelik), 1 → tek nitelik farkı (çok benzer).
 */
export function makeDistractors(target: Glyph, count: number, similarity: number, rng: Rng = Math.random): Glyph[] {
  const seen = new Set<string>([glyphKey(target)]);
  const out: Glyph[] = [];
  const maxChanges = Math.max(1, Math.round(4 - similarity * 3));
  let tries = 0;
  while (out.length < count) {
    tries++;
    const changes = tries > 80 ? 4 : randInt(Math.max(1, maxChanges - 1), maxChanges, rng);
    const g = mutateGlyph(target, changes, rng);
    const k = glyphKey(g);
    if (seen.has(k)) {
      if (tries > 400) break;
      continue;
    }
    seen.add(k);
    out.push(g);
  }
  return out;
}

function starPoints(): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 44 : 19;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function hexPoints(): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(50 + 42 * Math.cos(a)).toFixed(1)},${(50 + 42 * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const STAR = starPoints();
const HEX = hexPoints();

function ShapePath({ shape, paint }: { shape: ShapeName; paint: React.SVGProps<SVGElement> }) {
  const p = paint as React.SVGProps<SVGPathElement>;
  switch (shape) {
    case 'circle':
      return <circle cx="50" cy="50" r="38" {...(paint as React.SVGProps<SVGCircleElement>)} />;
    case 'square':
      return <rect x="14" y="14" width="72" height="72" rx="8" {...(paint as React.SVGProps<SVGRectElement>)} />;
    case 'triangle':
      return <polygon points="50,10 93,86 7,86" strokeLinejoin="round" {...(paint as React.SVGProps<SVGPolygonElement>)} />;
    case 'diamond':
      return <polygon points="50,6 94,50 50,94 6,50" strokeLinejoin="round" {...(paint as React.SVGProps<SVGPolygonElement>)} />;
    case 'star':
      return <polygon points={STAR} strokeLinejoin="round" {...(paint as React.SVGProps<SVGPolygonElement>)} />;
    case 'hexagon':
      return <polygon points={HEX} strokeLinejoin="round" {...(paint as React.SVGProps<SVGPolygonElement>)} />;
    case 'cross':
      return (
        <polygon
          points="38,10 62,10 62,38 90,38 90,62 62,62 62,90 38,90 38,62 10,62 10,38 38,38"
          strokeLinejoin="round"
          {...(paint as React.SVGProps<SVGPolygonElement>)}
        />
      );
    case 'moon':
      return <path d="M70 10 A40 40 0 0 0 70 90 A50 50 0 0 1 70 10 Z" strokeLinejoin="round" {...p} />;
  }
}

interface GlyphProps {
  glyph: Glyph;
  size?: number | string;
  colorAssist?: boolean;
  className?: string;
  /** Ekran okuyucu için ad; verilmezse süs olarak gizlenir. */
  label?: string;
}

/** Şekil + renk + dolgu + dönüş nitelikleri olan SVG sembol. */
export function GlyphSvg({ glyph, size = '100%', colorAssist = false, className, label }: GlyphProps) {
  const uid = useId();
  const color = COLOR_HEX[glyph.color];
  const patternId = `stripe-${uid.replace(/:/g, '')}`;
  let paint: React.SVGProps<SVGElement>;
  if (glyph.fill === 'solid') paint = { fill: color, stroke: color, strokeWidth: 2 };
  else if (glyph.fill === 'outline') paint = { fill: 'none', stroke: color, strokeWidth: 9 };
  else paint = { fill: `url(#${patternId})`, stroke: color, strokeWidth: 7 };

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {glyph.fill === 'striped' && (
        <defs>
          <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="12" height="12" fill="none" />
            <rect width="6" height="12" fill={color} />
          </pattern>
        </defs>
      )}
      <g transform={`rotate(${isRotatable(glyph.shape) ? glyph.rotation : 0} 50 50)`}>
        <ShapePath shape={glyph.shape} paint={paint} />
      </g>
      {colorAssist && (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="30"
          fontWeight="800"
          fill={glyph.fill === 'solid' ? '#fff' : color}
          stroke={glyph.fill === 'solid' ? color : 'var(--surface)'}
          strokeWidth="4"
          paintOrder="stroke"
        >
          {COLOR_LETTER[glyph.color]}
        </text>
      )}
    </svg>
  );
}
