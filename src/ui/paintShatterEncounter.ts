/**
 * Classic FF battle entry: the outgoing picture cracks from the centre and breaks into glass
 * shards that fly past the viewer, followed by a white flash. Geometry uses a fixed hash, so
 * every entry looks alike and nothing depends on gameplay RNG.
 */
export const SHATTER_COVER_MS = 980;
export const SHATTER_REVEAL_MS = 620;
/** Cover progress at which the glass audibly cracks and at which the shards break loose. */
export const SHATTER_CRACK = .1;
export const SHATTER_BREAK = .36;

interface Shard { points: [number, number][]; cx: number; cy: number; spin: number; speed: number; delay: number }

const hash = (a: number, b: number) => ((Math.imul(a + 17, 73856093) ^ Math.imul(b + 29, 19349663)) >>> 0) % 1000 / 1000;
let cached: {width: number; height: number; shards: Shard[]; rays: number; rings: number[]; angles: number[]} | undefined;

function geometry(width: number, height: number) {
  if (cached?.width === width && cached.height === height) return cached;
  const rays = 15, radius = Math.hypot(width, height) * .62;
  const angles = Array.from({length: rays}, (_, i) => (i + .5 * hash(i, 3) - .25) / rays * Math.PI * 2 - Math.PI / 2);
  const rings = [0, .09, .22, .4, .64, 1].map(r => r * radius);
  const point = (ray: number, ring: number): [number, number] => {
    const angle = angles[(ray + rays) % rays], wobble = ring && ring < rings.length - 1 ? .82 + .36 * hash(ray, ring) : 1;
    return [width / 2 + Math.cos(angle) * rings[ring] * wobble, height / 2 + Math.sin(angle) * rings[ring] * wobble];
  };
  const shards: Shard[] = [];
  for (let ring = 0; ring < rings.length - 1; ring++) for (let ray = 0; ray < rays; ray++) {
    const points = ring === 0 ? [point(ray, 0), point(ray, 1), point(ray + 1, 1)]
      : [point(ray, ring), point(ray, ring + 1), point(ray + 1, ring + 1), point(ray + 1, ring)];
    const cx = points.reduce((s, p) => s + p[0], 0) / points.length, cy = points.reduce((s, p) => s + p[1], 0) / points.length;
    shards.push({points, cx, cy, spin: (hash(ray, ring + 7) - .5) * 2.4, speed: .7 + .6 * hash(ray + 11, ring),
      delay: ring * .045 + hash(ray, ring + 3) * .05});
  }
  cached = {width, height, shards, rays, rings, angles};
  return cached;
}

const ease = (t: number) => t * t * (3 - 2 * t);

export function paintShatterCover(context: CanvasRenderingContext2D, image: HTMLCanvasElement,
  width: number, height: number, progress: number): void {
  const {shards} = geometry(width, height);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#02040b';
  context.fillRect(0, 0, width, height);
  const crack = Math.max(0, Math.min(1, (progress - SHATTER_CRACK) / (SHATTER_BREAK - SHATTER_CRACK)));
  const breakAge = Math.max(0, (progress - SHATTER_BREAK) / (1 - SHATTER_BREAK));
  // A short inward pull before the glass gives way.
  const pull = 1 + .035 * Math.sin(Math.min(1, progress / SHATTER_BREAK) * Math.PI / 2);
  for (const shard of shards) {
    const age = Math.max(0, Math.min(1, (breakAge - shard.delay) / .72));
    if (age >= 1) continue;
    const fly = ease(age), dx = shard.cx - width / 2, dy = shard.cy - height / 2;
    const scale = pull * (1 + fly * 1.35 * shard.speed);
    context.save();
    context.translate(width / 2 + dx * (pull + fly * 1.6 * shard.speed), height / 2 + dy * (pull + fly * 1.6 * shard.speed) + fly * fly * height * .12);
    context.rotate(shard.spin * fly);
    context.scale(scale, scale);
    context.translate(-shard.cx, -shard.cy);
    context.beginPath();
    shard.points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y));
    context.closePath();
    context.globalAlpha = 1 - fly * .85;
    context.save();
    context.clip();
    context.drawImage(image, 0, 0, width, height);
    // Glass sheen: shards catch light as they turn.
    if (age > 0) {
      context.fillStyle = `rgba(214, 232, 255, ${.28 * Math.abs(Math.sin(shard.spin * fly * 2.2))})`;
      context.fill();
    }
    context.restore();
    if (crack > 0) {
      context.strokeStyle = `rgba(232, 244, 255, ${Math.min(1, crack * 1.4) * (1 - fly) * .9})`;
      context.lineWidth = 1.2 / scale;
      context.stroke();
    }
    context.restore();
  }
  // Cracks reach outward from the impact point before the break; render them as growing lines.
  if (crack > 0 && crack < 1) {
    const {angles, rings} = geometry(width, height), reach = rings[rings.length - 1] * ease(crack);
    context.strokeStyle = 'rgba(240, 248, 255, .85)';
    context.lineWidth = 1.6;
    context.beginPath();
    for (const angle of angles) {
      context.moveTo(width / 2, height / 2);
      context.lineTo(width / 2 + Math.cos(angle) * reach, height / 2 + Math.sin(angle) * reach);
    }
    context.stroke();
  }
  const flash = breakAge > 0 ? Math.max(0, 1 - breakAge / .45) : 0;
  if (flash > 0) {
    context.globalAlpha = 1;
    context.fillStyle = `rgba(245, 250, 255, ${.6 * flash * flash})`;
    context.fillRect(0, 0, width, height);
  }
  context.globalAlpha = 1;
}

/** The new arena appears out of a fading white light. */
export function paintShatterReveal(context: CanvasRenderingContext2D, width: number, height: number, progress: number): void {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  const dark = (1 - ease(Math.min(1, progress / .75))) ** 1.5;
  if (dark > 0) {
    context.fillStyle = `rgba(2, 4, 11, ${dark})`;
    context.fillRect(0, 0, width, height);
  }
  const white = Math.max(0, 1 - progress / .32);
  if (white > 0) {
    context.fillStyle = `rgba(245, 250, 255, ${.85 * white * white})`;
    context.fillRect(0, 0, width, height);
  }
}
