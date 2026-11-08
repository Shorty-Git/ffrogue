/**
 * Title crystal: a hexagonal bipyramid (the classic FF crystal) that turns slowly about its long axis.
 * Each frame projects the six girdle points, keeps the faces that point at the viewer and shades them
 * by their angle to a light on the upper left. Colour cycling lives in titleCrystal.css.
 */
const SIDES = 6, TOP = 6, GIRDLE = 96, BOTTOM = 224, CENTER = 60, RADIUS = 46, TURN_MS = 9000;
const NS = 'http://www.w3.org/2000/svg';

export function titleCrystalMarkup(): string {
  return `<div class="crystal-sigil"><span class="crystal-halo"></span><svg class="crystal-svg" viewBox="0 0 120 230" role="img" aria-label="Crystal">
 <defs><linearGradient id="crystal-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <clipPath id="crystal-outline"><polygon class="crystal-outline-shape"/></clipPath></defs>
 <g class="crystal-faces"></g>
 <g clip-path="url(#crystal-outline)"><rect class="crystal-sweep" x="-60" y="-20" width="44" height="280" fill="url(#crystal-shine)" transform="rotate(18 60 115)"/></g>
</svg></div>`;
}

/** Light blue facet shades, from the lit side (0) to the shadow side (1). */
function shade(light: number, lower: boolean): string {
  const t = Math.max(0, Math.min(1, light));
  const from = lower ? [128, 205, 248] : [222, 247, 255], to = lower ? [22, 74, 158] : [44, 128, 208];
  const c = from.map((value, i) => Math.round(value + (to[i] - value) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function startTitleCrystal(root: HTMLElement): () => void {
  const faces = root.querySelector<SVGGElement>('.crystal-faces');
  const outline = root.querySelector<SVGPolygonElement>('.crystal-outline-shape');
  if (!faces || !outline) return () => {};
  const polygons = Array.from({length: SIDES * 2}, () => {
    const polygon = document.createElementNS(NS, 'polygon');
    polygon.setAttribute('stroke', '#f2fcffaa');
    polygon.setAttribute('stroke-width', '.8');
    polygon.setAttribute('stroke-linejoin', 'round');
    faces.append(polygon);
    return polygon;
  });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  const draw = (angle: number) => {
    const points = Array.from({length: SIDES}, (_, k) => {
      const phi = angle + k * Math.PI * 2 / SIDES;
      return {x: CENTER + RADIUS * Math.sin(phi), y: GIRDLE + 7 * Math.cos(phi)};
    });
    let visible = 0;
    for (let k = 0; k < SIDES; k++) {
      const mid = angle + (k + .5) * Math.PI * 2 / SIDES;
      const facing = Math.cos(mid);
      const a = points[k], b = points[(k + 1) % SIDES];
      for (const lower of [false, true]) {
        const polygon = polygons[k * 2 + (lower ? 1 : 0)];
        if (facing <= 0) { polygon.setAttribute('visibility', 'hidden'); continue; }
        // Light from the upper left: faces turned left (sin < 0) are brightest.
        const light = .5 + .5 * Math.sin(mid) + (1 - facing) * .25;
        const apex = lower ? `${CENTER},${BOTTOM}` : `${CENTER},${TOP}`;
        polygon.setAttribute('points', `${apex} ${a.x.toFixed(2)},${a.y.toFixed(2)} ${b.x.toFixed(2)},${b.y.toFixed(2)}`);
        polygon.setAttribute('fill', shade(light, lower));
        polygon.setAttribute('visibility', 'visible');
        visible++;
      }
    }
    // Silhouette for the shine sweep: apexes plus the outermost girdle points.
    const left = points.reduce((m, p) => p.x < m.x ? p : m), right = points.reduce((m, p) => p.x > m.x ? p : m);
    outline.setAttribute('points', `${CENTER},${TOP} ${right.x},${right.y} ${CENTER},${BOTTOM} ${left.x},${left.y}`);
    return visible;
  };
  const started = performance.now();
  const tick = (now: number) => {
    if (!root.isConnected) return;
    draw(((now - started) / TURN_MS) * Math.PI * 2);
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    if (reduced.matches) draw(.35);
    else frame = requestAnimationFrame(tick);
  };
  reduced.addEventListener('change', sync);
  sync();
  return () => { cancelAnimationFrame(frame); reduced.removeEventListener('change', sync); };
}
