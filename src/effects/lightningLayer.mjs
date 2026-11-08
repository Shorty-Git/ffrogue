/**
 * Approximate renderer for BMB node type 7 (lightning emitter), see
 * docs/research/bmb-node-type-7-lightning.md. The frozen effect player never sees these nodes:
 * preparation records them as `effect.lightning` entries (parent node, colour, life, texture,
 * FieldGoal count) and this layer draws jagged additive bolts from the parent's world position
 * to the member's target. Only entries with FieldGoal children are drawn (bolts); others are
 * still omitted. Visual approximation, not the native lightning algorithm.
 */
const SEGMENTS = 10, WIDTH = 14, RESEED_FRAMES = 2, SKY_OFFSET = 420;

export function createLightningLayer(THREE, layerScene, player, plan, members, textureUrl) {
  const entries = [];
  const items = player.traceSnapshot(), roots = layerScene.children.slice(0, members.length);
  let k = 0;
  roots.forEach((root, memberIndex) => {
    const member = members[memberIndex], effect = plan.effects[member.effect];
    const groups = new Map();
    for (const group of root.children) { const node = items[k++]?.node; if (!groups.has(node)) groups.set(node, group); }
    for (const bolt of effect.lightning ?? []) {
      if (!bolt.goals || !groups.has(bolt.parent)) continue;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 2 * 3), 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 2 * 2), 2));
      const index = [];
      for (let s = 0; s < SEGMENTS; s++) { const a = s * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geometry.setIndex(index);
      const material = new THREE.MeshBasicMaterial({color: new THREE.Color(...bolt.color), transparent: true,
        blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide, opacity: 0});
      const url = bolt.texture && textureUrl(effect, bolt.texture);
      if (url) new THREE.TextureLoader().load(url, texture => { material.map = texture; material.needsUpdate = true; });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = memberIndex * 1000 + 999; mesh.frustumCulled = false; mesh.visible = false;
      layerScene.add(mesh);
      entries.push({member, parent: groups.get(bolt.parent), bolt, mesh, firstVisible: null, seed: memberIndex * 97 + bolt.sourceIndex});
    }
  });
  if (k !== items.length) throw Error('Lightning layer lost the player item mapping');
  const random = seed => { let s = seed >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; };
  const world = new THREE.Vector3();
  return {
    count: entries.length,
    update(frame, targetPoint) {
      for (const entry of entries) {
        const {mesh, parent, bolt} = entry;
        parent.updateWorldMatrix(true, false);
        let alive = parent.visible && parent.parent?.visible !== false;
        if (alive && entry.firstVisible === null) entry.firstVisible = frame;
        const age = entry.firstVisible === null ? -1 : frame - entry.firstVisible - bolt.start;
        alive = alive && age >= 0 && age < bolt.life;
        mesh.visible = alive;
        if (!alive) { if (!parent.visible) entry.firstVisible = null; continue; }
        world.setFromMatrixPosition(parent.matrixWorld);
        const end = targetPoint(entry.member) ?? {x: world.x, y: world.y - SKY_OFFSET};
        // Bolts fall onto the target; a source at the target strikes down from above it.
        const start = Math.hypot(world.x - end.x, world.y - end.y) < 40 ? {x: end.x, y: end.y + SKY_OFFSET} : {x: world.x, y: world.y};
        const rng = random(entry.seed + Math.floor(age / RESEED_FRAMES) * 7919);
        const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy) || 1, nx = -dy / length, ny = dx / length;
        const position = mesh.geometry.attributes.position.array, uv = mesh.geometry.attributes.uv.array;
        for (let s = 0; s <= SEGMENTS; s++) {
          const t = s / SEGMENTS, jitter = (s === 0 || s === SEGMENTS) ? 0 : (rng() - .5) * length * .12;
          const cx = start.x + dx * t + nx * jitter, cy = start.y + dy * t + ny * jitter, w = WIDTH * (1 - .5 * t);
          position.set([cx - nx * w / 2, cy - ny * w / 2, 0, cx + nx * w / 2, cy + ny * w / 2, 0], s * 6);
          uv.set([0, t, 1, t], s * 4);
        }
        mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.attributes.uv.needsUpdate = true;
        mesh.material.opacity = Math.max(0, Math.min(1, 1 - age / bolt.life + .3 * rng()));
      }
    },
    dispose() { for (const e of entries) { layerScene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.map?.dispose(); e.mesh.material.dispose(); } },
  };
}
