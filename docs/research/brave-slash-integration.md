# Brave Slash effect integration

## Asset and reproduction

Master mapping: ability 214800 -> group 5008050 -> effect 5006440 ->
`atk_impact_001_pink.bmb`. The local ExviusReborn package supplies a converted
`atk_impact_001_pink.efkefc` and a companion `atk_impact_001_pink_flashcut.efkefc`.
The first bake visibly produced a large white rectangular flash in battle.
The companion variant has no white.png dependency and omits that flash plane;
it was baked and checked again in battle. Other model edges remain part of the
converted effect. This is not a claim of pixel-identical original playback.

Run `node tools/export_brave_slash.mjs`, then open `http://127.0.0.1:3102/`.
Requires the local assets package and previously installed offline Effekseer SDK.
The server serves only allowlisted dependencies and writes the prepared sheet
and provenance manifest to `public/assets/effects/brave_slash/`. Stop after use.
The source SHA-256 and original master file are recorded in the manifest.

The 256-pixel frames are baked against black for additive blending (not normal
alpha compositing), 90 frames at 60 FPS, with an orthographic width of 768 source
units. The frame center anchors to the target sprite's world-space bounds center.
Runtime uses Phaser ADD, depth 1100, and destroys the effect on completion.
Scene shutdown/restart destroys remaining scene objects and timers.

## Runtime changes

- BootScene loads the effect manifest; PreloadScene loads only its prepared sheet.
- Cloud skills.json declares the visual effect and source start frame 4. The
  extraction script preserves this association when regenerating skill data.
- BattleScene starts the effect at frame 4 (66.67 ms), damage at the first
  attackFrames entry, frame 6 (100 ms), relative to the attack pose after arrival.
- The attack pose runs for its exported duration plus the existing 80 ms hit-stop
  before the return movement. Other skills retain their previous timing.
- Delayed effect playback checks battle state and target HP before spawning.
- `ffbe_data-master/` is ignored by Git and Vite's file watcher.

## Verification

- Browser export completed, Pillow checked sheet dimensions 2560 x 2304 and
  inspected sampled frames of the flashcut variant.
- Actual game UI: selected Cloud -> Skill -> Brave Slash. Confirmed pink effect
  over the rat, no large white flash rectangle, one damage popup, MP 100 -> 82,
  return to home position and advancement to Aerith.
- `npm run build` passed, with the existing Vite large-chunk advisory.
- `node tools/test_combat_regressions.mjs`: 17 checks passed, including source
  frame scheduling and suppression of a delayed effect on a defeated target.
- No full run, original-game fidelity comparison, or multi-hit skill verification.

Browser proof: `tools/data/cloud-effects/brave-slash-in-game.png` (ignored).
