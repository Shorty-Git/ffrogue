import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DUMP_DIR = path.resolve(ROOT_DIR, 'ffbe_asset_dump-main');
const DOCS_DIR = path.resolve(ROOT_DIR, 'docs');
const OUTPUT_FILE = path.resolve(DOCS_DIR, 'asset_structure.md');

/**
 * Main indexer function.
 */
async function main() {
  console.log('[Index] Scanning ffbe_asset_dump-main directory structure...');
  if (!fs.existsSync(DUMP_DIR)) {
    console.error(`[Error] Dump directory not found at: ${DUMP_DIR}`);
    process.exit(1);
  }

  const topItems = fs.readdirSync(DUMP_DIR, { withFileTypes: true });
  const folderStats = [];
  const rootFiles = [];

  for (const item of topItems) {
    if (item.isDirectory()) {
      const folderPath = path.join(DUMP_DIR, item.name);
      const files = fs.readdirSync(folderPath);
      const extCounts = {};
      const prefixCounts = {};
      const sampleFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = path.extname(file).toLowerCase() || '[none]';
        extCounts[ext] = (extCounts[ext] || 0) + 1;

        // Extract prefix before first underscore or number
        const match = file.match(/^([a-zA-Z]+(?:_[a-zA-Z]+)?)/);
        if (match) {
          const prefix = match[1];
          prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
        }

        if (sampleFiles.length < 5) {
          sampleFiles.push(file);
        }
      }

      // Sort prefixes by frequency
      const topPrefixes = Object.entries(prefixCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([p, count]) => `${p} (${count})`);

      folderStats.push({
        name: item.name,
        totalFiles: files.length,
        extCounts,
        topPrefixes,
        sampleFiles,
      });
    } else {
      rootFiles.push(item.name);
    }
  }

  // Sort folders alphabetically
  folderStats.sort((a, b) => a.name.localeCompare(b.name));

  // Specific analysis for ui_effect
  const uiEffectDir = path.join(DUMP_DIR, 'ui_effect');
  let uiEffectList = [];
  if (fs.existsSync(uiEffectDir)) {
    uiEffectList = fs.readdirSync(uiEffectDir);
  }

  // Specific analysis for animated_gifs
  const gifDir = path.join(DUMP_DIR, 'animated_gifs');
  let gifCategories = { unit: 0, monster: 0, atkeff: 0, other: 0 };
  let gifSampleAtkEff = [];
  if (fs.existsSync(gifDir)) {
    const gifFiles = fs.readdirSync(gifDir);
    for (const f of gifFiles) {
      if (f.includes('atkeff')) {
        gifCategories.atkeff++;
        if (gifSampleAtkEff.length < 10) gifSampleAtkEff.push(f);
      } else if (f.startsWith('unit_')) {
        gifCategories.unit++;
      } else if (f.startsWith('monster_')) {
        gifCategories.monster++;
      } else {
        gifCategories.other++;
      }
    }
  }

  // Specific analysis for battle_bg
  const bgDir = path.join(DUMP_DIR, 'battle_bg');
  let bgSamples = [];
  if (fs.existsSync(bgDir)) {
    bgSamples = fs.readdirSync(bgDir).slice(0, 8);
  }

  console.log(`[Index] Scanned ${folderStats.length} directories. Generating markdown atlas...`);

  const mdContent = generateMarkdown({
    folderStats,
    rootFiles,
    uiEffectList,
    gifCategories,
    gifSampleAtkEff,
    bgSamples,
  });

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, mdContent, 'utf-8');
  console.log(`[Success] Asset atlas successfully created at: ${OUTPUT_FILE}`);
}

function generateMarkdown(data) {
  const { folderStats, rootFiles, uiEffectList, gifCategories, gifSampleAtkEff, bgSamples } = data;

  const totalDumpFiles = folderStats.reduce((sum, f) => sum + f.totalFiles, 0) + rootFiles.length;

  let md = `# FFBE Asset Dump Atlas & Structure Guide

This document is the canonical reference guide for the local repository \`ffbe_asset_dump-main/\`.
It provides complete directory maps, file naming conventions, ID decoding schemas, and standard workflows for importing assets into our game.

> [!IMPORTANT]
> Always consult this guide before searching for or importing units, monsters, battle backgrounds, or visual effects.

---

## 1. High-Level Summary

- **Total Directories:** ${folderStats.length}
- **Total Cataloged Files:** ${totalDumpFiles.toLocaleString()} files
- **Primary Resource Types:**
  - **Characters (Sprites & Animation CSVs):** \`unit_animated/\` (${folderStats.find(f => f.name === 'unit_animated')?.totalFiles.toLocaleString() || 0} sheets) & \`unit_animated_csv/\` (${folderStats.find(f => f.name === 'unit_animated_csv')?.totalFiles.toLocaleString() || 0} CSV tracks)
  - **Monsters (Sprites & Animation CSVs):** \`monster_animated/\` (${folderStats.find(f => f.name === 'monster_animated')?.totalFiles.toLocaleString() || 0} sheets) & \`monster_animated_csv/\` (${folderStats.find(f => f.name === 'monster_animated_csv')?.totalFiles.toLocaleString() || 0} CSV tracks)
  - **Animated Preview GIFs:** \`animated_gifs/\` (${folderStats.find(f => f.name === 'animated_gifs')?.totalFiles.toLocaleString() || 0} preview GIFs)
  - **Battle Backgrounds:** \`battle_bg/\` (${folderStats.find(f => f.name === 'battle_bg')?.totalFiles.toLocaleString() || 0} arena textures)
  - **UI / Particle Materials:** \`ui_effect/\` (${uiEffectList.length} beam, ring, and aura textures)
  - **Skill & Ability Icons:** \`abilities/\` (${folderStats.find(f => f.name === 'abilities')?.totalFiles.toLocaleString() || 0} icons)

---

## 2. Complete Directory Map

| Folder | File Count | Primary Extensions | Primary Prefixes / Contents | Description & Role |
| :--- | :---: | :--- | :--- | :--- |
`;

  for (const f of folderStats) {
    const extStr = Object.entries(f.extCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} (${v})`)
      .slice(0, 3)
      .join(', ');

    const prefixStr = f.topPrefixes.slice(0, 2).join(', ') || 'Varied';
    const roleDesc = getFolderRoleDescription(f.name);

    md += `| \`${f.name}/\` | ${f.totalFiles.toLocaleString()} | ${extStr} | ${prefixStr} | ${roleDesc} |\n`;
  }

  md += `
---

## 3. Naming Conventions & Patterns

### A. Character Assets (\`unit_*\`)
Character assets share a 9-digit unit identifier (e.g. \`207000105\` for Cloud):
- **Raw Atlas Texture:** \`unit_animated/unit_anime_<UNIT_ID>.png\`
- **Part Coordinate Definition (CGG):** \`unit_animated_csv/unit_cgg_<UNIT_ID>.csv\`
- **Animation Track (CGS):** \`unit_animated_csv/unit_<ANIM>_cgs_<UNIT_ID>.csv\`
  - Common animations: \`idle\`, \`move\`, \`atk\`, \`standby\`, \`magic_atk\`, \`magic_standby\`, \`limit_atk\`, \`dead\`, \`dying\`, \`jump\`, \`win\`, \`win_before\`.
  - Multi-attack units (e.g. NV units): \`atk1\`, \`atk2\`, \`atk3\`, \`limit_move\`, \`brave_shift\`.
- **UI Icons:** \`unit_icons/unit_icon_<UNIT_ID>.png\`
- **Illustrations:** \`unit_illustrations/unit_ills_<UNIT_ID>.png\`

### B. Monster Assets (\`monster_*\`)
Monster assets share a 4-to-6 digit monster identifier (e.g. \`10001\` for Dire Rat):
- **Raw Atlas Texture:** \`monster_animated/monster_anime_<MONSTER_ID>.png\`
- **Part Coordinate Definition (CGG):** \`monster_animated_csv/monster_cgg_<MONSTER_ID>.csv\`
- **Animation Track (CGS):** \`monster_animated_csv/monster_<ANIM>_cgs_<MONSTER_ID>.csv\`
  - Common animations: \`idle\`, \`move\`, \`atk\`, \`die\`, \`damage\`.
- **Monster Icons:** \`monster_icon/monster_icon_<MONSTER_ID>.png\`

### C. Animated GIFs (\`animated_gifs/\`)
The \`animated_gifs/\` folder contains ${folderStats.find(f => f.name === 'animated_gifs')?.totalFiles.toLocaleString() || 0} pre-rendered GIF files:
- **Unit Previews:** ${gifCategories.unit.toLocaleString()} files (Pattern: \`unit_<ID>_<ANIM>_opac.gif\`, e.g. \`unit_207000105_1idle_opac.gif\`)
- **Monster Previews:** ${gifCategories.monster.toLocaleString()} files (Pattern: \`monster_<ID>_<ANIM>_opac.gif\`)
- **Attack Effect Overlays:** ${gifCategories.atkeff.toLocaleString()} files (Pattern: \`unit_<ID>_atkeff_opac.gif\` or \`unit_<ID>_limitatkeff_opac.gif\`)
  - Samples: \`${gifSampleAtkEff.slice(0, 4).join('`, `')}\`

### D. UI & Particle Effect Materials (\`ui_effect/\`)
Contains ${uiEffectList.length} standalone texture assets used for spells, beams, lasers, and summon auras:
- **Beams & Lasers:** \`beam_003.png\`, \`beam_005.png\`, \`deffuse_laser_002.png\`
- **Auras & Glows:** \`deffuse_aura_001.png\`, \`glow_001.png\`, \`glow_008.png\`
- **Rings & Particles:** \`eff_material_33_0016_ring18.png\`, \`lapis_eff_material_003_0016_cross2.png\`, \`thunder1_1_128_128.png\`

### E. Battle Backgrounds (\`battle_bg/\`)
Contains ${folderStats.find(f => f.name === 'battle_bg')?.totalFiles.toLocaleString() || 0} arena backgrounds:
- **Naming Pattern:** \`battle_bg_<BG_ID>.png\` (e.g. \`${bgSamples.slice(0, 4).join('`, `')}\`)
- **Format:** Fully composed 2D arena textures (typically 640x480 or wider), ready for Phaser parallax or static arena rendering.

---

## 4. 9-Digit Unit ID Deciphering Table

FFBE uses structured 9-digit unit IDs (\`GSS0000RR\`):
- **\`G\` (1st digit):** Game Category
  - \`1\`: FFBE Original (e.g. \`100000102\` Rain, \`100000202\` Lasswell, \`100000302\` Fina)
  - \`2\`: Mainline Final Fantasy
  - \`3\`: Crossover / Collaboration
- **\`SS\` (2nd & 3rd digits):** Specific Final Fantasy Series

| Series Code | Game Title | Notable Characters & IDs |
| :---: | :--- | :--- |
| \`201\` | Final Fantasy I | Warrior of Light (\`201000105\`), Garland (\`201000205\`) |
| \`202\` | Final Fantasy II | Firion (\`202000105\`), The Emperor (\`202000205\`) |
| \`203\` | Final Fantasy III | Luneth (\`203000105\`), Cloud of Darkness (\`203000803\`) |
| \`204\` | Final Fantasy IV | Cecil (\`204000103\`), Kain (\`204000204\`), Rydia (\`204000303\`) |
| \`205\` | Final Fantasy V | Bartz (\`205000103\`), Exdeath (\`205000203\`), Gilgamesh (\`205000805\`) |
| \`206\` | Final Fantasy VI | Terra (\`206000103\`), Locke (\`206000203\`), Celes (\`206000304\`), Kefka (\`206000403\`) |
| \`207\` | Final Fantasy VII | Cloud (\`207000105\`), Barret (\`207000204\`), Tifa (\`207000304\`), Aerith (\`207000405\`), Sephiroth (\`207000505\`) |
| \`208\` | Final Fantasy VIII | Squall (\`208000105\`), Rinoa (\`208000205\`) |
| \`209\` | Final Fantasy IX | Zidane (\`209000103\`), Garnet (\`209000204\`), Vivi (\`209000303\`) |
| \`210\` | Final Fantasy X | Tidus (\`210000105\`), Yuna (\`210000205\`), Auron (\`210000705\`), Lulu (\`210002507\`) |
| \`211\` | Final Fantasy XI | Shantotto (\`211000104\`) |
| \`212\` | Final Fantasy XII | Vaan (\`212000103\`), Balthier (\`212000405\`) |
| \`213\` | Final Fantasy XIII | Lightning (\`213000105\`) |
| \`214\` | Final Fantasy XIV | Y'shtola (\`214000104\`) |
| \`215\` | Final Fantasy XV | Noctis (\`215000105\`), Gladiolus (\`215000205\`), Prompto (\`215000305\`) |
| \`216\` | Final Fantasy Tactics | Ramza (\`216000105\`), Agrias (\`216000204\`) |
| \`254\` | Type-0 | Ace (\`254000105\`), Trey (\`254000403\`), Rem (\`254000905\`) |
| \`313\` | Bravely Default | Edea (\`313000404\`), Agnes (\`313000105\`) |
| \`322\` | NieR: Automata | 2B (\`322000105\`), 9S (\`322000204\`), A2 (\`322000305\`) |
| \`331\` | Xenogears | Fei (\`331000105\`), Elly (\`331000205\`) |
| \`335\` | Kingdom Hearts | Sora (\`335000105\`), Cloud KH (\`335000205\`) |

- **\`RR\` (Last 2 digits):** Unit Form / Rarity
  - \`03\`: 3★ Base Form
  - \`04\`: 4★ Base Form
  - \`05\`: 5★ Base Form
  - \`06\`: 6★ Awakening Form
  - \`07\`: 7★ Awakening Form
  - \`17\` / \`27\`: Neo Vision (NV) & Brave Shift Form

---

## 5. Standard Import Workflows

### Workflow 1: Inspecting an Asset Before Importing
1. Check \`animated_gifs/\` to view the animation preview:
   - For Cloud: \`animated_gifs/unit_207000105_3atk_opac.gif\`
   - For Dire Rat: \`animated_gifs/monster_10001_atk_opac.gif\`
2. Confirm the exact raw files exist in \`unit_animated/\` and \`unit_animated_csv/\`.

### Workflow 2: Importing a Character Unit
Run the automated pipeline script:
\`\`\`powershell
# Using ID:
node tools/import_unit.mjs --id 207000105 --name cloud

# Or using Python:
py tools/import_unit.py --id 207000105 --name cloud
\`\`\`
This pulls raw files, runs \`tools/bin/ffbetool.exe\`, aligns pivots, and writes \`public/assets/units/<name>/\`.

### Workflow 3: Importing a Monster
\`\`\`powershell
# Example for Dire Rat (10001):
py tools/import_unit.py --id 10001 --name dire_rat --type monster
\`\`\`

### Workflow 4: Importing an Arena Background
Copy the desired PNG directly from \`ffbe_asset_dump-main/battle_bg/\` into \`public/assets/backgrounds/\`:
\`\`\`powershell
Copy-Item "ffbe_asset_dump-main/battle_bg/battle_bg_0001.png" "public/assets/backgrounds/arena_01.png"
\`\`\`
`;

  return md;
}

function getFolderRoleDescription(folderName) {
  const roles = {
    abilities: 'Active skill & ability square icons (PNG)',
    animated_gifs: 'Pre-rendered animated GIF previews for units, monsters & effects',
    battle_bg: 'Full 2D arena and battle background illustrations (PNG)',
    catalog: 'Game dump JSON catalogs and index manifests',
    chain_ability: 'Chaining family icons and badges',
    emblems: 'Player profile rank emblems and badges',
    equip: 'Weapon, armor, and accessory item sprites',
    ex_gambit_icons: 'Gambit and action condition icons',
    gallery: 'Cutscene stills and promotional artwork',
    global_abilities: 'Global-exclusive ability icons',
    global_emblems: 'Global-exclusive player emblems',
    global_equipment: 'Global-exclusive weapon and equipment icons',
    global_items: 'Global-exclusive consumable icons',
    global_materia: 'Global-exclusive materia icons',
    items: 'Consumable item and material icons',
    materia: 'Standard materia equipment icons',
    misc: 'Miscellaneous game textures (recipes, banners)',
    monster_animated: 'Raw monster sprite atlas sheets (PNG)',
    monster_animated_csv: 'Monster part coordinates (CGG) & animation tracks (CGS)',
    monster_assets: 'Monster SSBP files and frame pieces',
    monster_icon: 'Monster bestiary portrait icons',
    regional_units: 'Region-specific unit variants',
    reports: 'Asset update and compilation reports',
    tools: 'Dump maintenance scripts',
    town: 'Town exploration map textures and tiles',
    ui_effect: 'Standalone spell, laser, aura, and beam particle textures',
    unit_animated: 'Raw character unit sprite atlas sheets (PNG)',
    unit_animated_csv: 'Unit part coordinates (CGG) & animation tracks (CGS)',
    unit_assets: 'Character SSBP animation binaries and individual frames',
    unit_bundles: 'Promotional bundle images',
    unit_icons: 'Character portrait icons (party select / compendium)',
    unit_illustrations: 'Full-body character official illustrations (PNG)',
    vc_animated_csv: 'Vision Card animated CSV files',
    vc_bg: 'Vision Card background art',
    vc_frame: 'Vision Card frame borders',
    vc_vignette_animated: 'Vision Card animated vignette sheets',
    vc_vignette_icon: 'Vision Card vignette icons',
    vc_vignette_item: 'Vision Card item representations',
    world: 'World map exploration node textures',
  };

  return roles[folderName] || 'General game asset archive';
}

main().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
