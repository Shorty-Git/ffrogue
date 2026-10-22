import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');

const REPO_BASE = 'https://raw.githubusercontent.com/aEnigmatic/ffbe/master';
const SOURCES = {
  units: `${REPO_BASE}/units.json`,
  abilities: `${REPO_BASE}/skills_ability.json`,
  magic: `${REPO_BASE}/skills_magic.json`,
};

// Curated signature presets for player heroes in MVP
const SIGNATURE_PRESETS = {
  '207000105': ['brave_slash', 'blade_beam', 'climhazzard'],
  'cloud': ['brave_slash', 'blade_beam', 'climhazzard'],
  '207000405': ['healing_wind', 'curaja', 'banishga'],
  'aerith': ['healing_wind', 'curaja', 'banishga'],
  '207000204': ['big_shot', 'grenade_bomb', 'satellite_beam'],
  'barret': ['big_shot', 'grenade_bomb', 'satellite_beam'],
};

/**
 * Ensures data directory exists and required JSON files are downloaded and cached.
 */
async function ensureDataFile(name, url) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const filePath = path.join(DATA_DIR, `${name}.json`);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > 1000) {
      console.log(`[Cache] Found local ${name}.json (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  }

  console.log(`[Download] Fetching ${name}.json from ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  fs.writeFileSync(filePath, text, 'utf-8');
  console.log(`[Download] Saved ${name}.json (${(text.length / 1024 / 1024).toFixed(2)} MB)`);
  return JSON.parse(text);
}

/**
 * Parse CLI args.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    unit: '207000105', // Default: Cloud
    out: null,
    all: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--all' || arg === '-a') {
      options.all = true;
    } else if (arg === '--unit' || arg === '-u') {
      options.unit = args[++i];
    } else if (arg === '--out' || arg === '-o') {
      options.out = args[++i];
    } else if (!arg.startsWith('-') && !options.unitSpecified) {
      options.unit = arg;
      options.unitSpecified = true;
    }
  }

  return options;
}

/**
 * Finds the unit definition in units.json by ID, entry ID, or name.
 */
function findUnit(unitsData, query) {
  // Direct key lookup
  if (unitsData[query]) {
    return { id: query, data: unitsData[query] };
  }

  // Check if query is an entry ID
  for (const [key, u] of Object.entries(unitsData)) {
    if (u.entries && Object.keys(u.entries).includes(query)) {
      return { id: key, data: u };
    }
  }

  // Name match (case-insensitive)
  const lowerQuery = query.toLowerCase();
  for (const [key, u] of Object.entries(unitsData)) {
    if (u.name && u.name.toLowerCase() === lowerQuery) {
      return { id: key, data: u };
    }
    if (u.names && u.names.some(n => n.toLowerCase() === lowerQuery)) {
      return { id: key, data: u };
    }
  }

  return null;
}

/**
 * Extracts multiplier from effect text (e.g. "Physical damage (2.75x * 2 = 5.5x, ATK) to one enemy")
 */
function extractMultiplier(effectText) {
  if (!effectText) return 1.0;

  // Check for combined multiplier like "= 5.5x"
  const eqMatch = effectText.match(/=\s*(\d+(?:\.\d+)?)x/i);
  if (eqMatch) {
    return parseFloat(eqMatch[1]);
  }

  // Check for standard "(2x, ATK)" or "(3.5x)"
  const stdMatch = effectText.match(/\((\d+(?:\.\d+)?)x/i);
  if (stdMatch) {
    return parseFloat(stdMatch[1]);
  }

  return 1.0;
}

/**
 * Determines target scope from effect description.
 */
function extractScope(effectText) {
  if (!effectText) return 'single_enemy';
  const text = effectText.toLowerCase();

  if (text.includes('to all enemies') || text.includes('all enemies')) {
    return 'all_enemies';
  }
  if (text.includes('to all allies') || text.includes('party') || text.includes('all allies')) {
    return 'party';
  }
  if (text.includes('to one ally') || text.includes('one ally') || text.includes('caster')) {
    return 'single_ally';
  }
  return 'single_enemy';
}

/**
 * Main extraction function.
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Usage: node tools/extract_unit_skills.mjs [options]

Options:
  -u, --unit <id|name>   Unit ID (e.g. 207000105) or Name (default: Cloud)
  -o, --out <path>       Output JSON file path (default: public/assets/units/<name>/skills.json)
  -a, --all              Include all active skills (default: curated signature skills)
  -h, --help             Show this help message
    `);
    process.exit(0);
  }

  console.log(`[Init] Checking FFBE datamining cache...`);
  const [unitsData, abilitiesData, magicData] = await Promise.all([
    ensureDataFile('units', SOURCES.units),
    ensureDataFile('skills_ability', SOURCES.abilities),
    ensureDataFile('skills_magic', SOURCES.magic),
  ]);

  const unitMatch = findUnit(unitsData, options.unit);
  if (!unitMatch) {
    console.error(`[Error] Unit '${options.unit}' not found in units.json!`);
    process.exit(1);
  }

  const { id: rootId, data: unit } = unitMatch;
  const unitSlug = unit.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  console.log(`[Match] Found Unit: ${unit.name} (Root ID: ${rootId}, Game: ${unit.game || 'FFBE'})`);

  if (!unit.skills || !Array.isArray(unit.skills)) {
    console.error(`[Error] Unit '${unit.name}' has no skill data.`);
    process.exit(1);
  }

  const parsedSkills = [];
  const seenSlugs = new Set();

  for (const s of unit.skills) {
    let skillObj = null;
    let skillType = s.type;

    if (skillType === 'ABILITY') {
      skillObj = abilitiesData[s.id];
    } else if (skillType === 'MAGIC') {
      skillObj = magicData[s.id];
    }

    if (!skillObj) continue;

    const name = skillObj.name;
    const mpCost = skillObj.cost?.MP ?? skillObj.mp_cost ?? 0;
    const effectsList = skillObj.effects || [];
    const primaryEffect = effectsList[0]?.[0] || '';

    // Filter out internal mechanic cooldown unlockers (e.g. "Unlock Limit Braver on turn 3")
    if (primaryEffect.toLowerCase().includes('unlock ') && primaryEffect.toLowerCase().includes(' turn ')) {
      continue;
    }

    // Filter out 0 MP basic placeholders unless explicitly --all
    if (mpCost === 0 && !options.all) {
      continue;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    // Deduplicate by slug
    if (seenSlugs.has(slug) && !options.all) {
      continue;
    }
    seenSlugs.add(slug);

    let scope = extractScope(primaryEffect);
    let multiplier = extractMultiplier(primaryEffect);
    const attackFrames = skillObj.attack_frames?.[0] || [];
    const hitCount = skillObj.attack_count?.[0] || attackFrames.length || 1;

    // Balance special magic/heal multipliers for standard RPG battle system
    if (slug === 'banishga') multiplier = 3.0;
    if (slug === 'curaja') {
      multiplier = 2.0;
      scope = 'party';
    }
    if (slug === 'healing_wind') {
      multiplier = 1.0;
      scope = 'party';
    }

    // Move type: 1 = Dash to target, 4 = Stationary/Ranged
    const moveType = skillObj.move_type === 1 ? 'dash' : 'stationary';
    // Motion type: 1 = Attack, 2 = Magic Cast
    const motion = skillObj.motion_type === 2 ? 'magic_atk' : (skillType === 'MAGIC' ? 'magic_atk' : 'atk');

    parsedSkills.push({
      id: slug,
      ffbeId: s.id,
      name,
      rarity: s.rarity,
      level: s.level,
      type: skillType,
      mpCost,
      scope,
      damageMultiplier: multiplier,
      hitCount,
      attackFrames,
      moveType,
      motion,
      desc: primaryEffect,
      ...(String(rootId) === '207000105' && s.id === 214800
        ? { visualEffect: { key: 'brave_slash', startFrame: 4 } } : {}),
    });
  }

  // Filter signature skills if --all is not specified
  let outputSkills = parsedSkills;
  if (!options.all) {
    const preset = SIGNATURE_PRESETS[rootId] || SIGNATURE_PRESETS[unitSlug];
    if (preset) {
      outputSkills = preset
        .map(slug => parsedSkills.find(s => s.id === slug))
        .filter(Boolean);
    } else {
      outputSkills = parsedSkills.filter(sk => sk.mpCost <= 65).slice(0, 6);
    }
  }

  // Output formatting
  const outPath = options.out
    ? path.resolve(process.cwd(), options.out)
    : path.resolve(process.cwd(), `public/assets/units/${unitSlug}/skills.json`);

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const resultData = {
    unitId: rootId,
    unitName: unit.name,
    game: unit.game || 'FF',
    extractedAt: new Date().toISOString(),
    skills: outputSkills,
  };

  fs.writeFileSync(outPath, JSON.stringify(resultData, null, 2), 'utf-8');
  console.log(`\n[Success] Exported ${outputSkills.length} skills to: ${outPath}\n`);

  // Print readable table
  console.log(`=== Authentic Skills Extracted for ${unit.name} ===`);
  console.table(
    outputSkills.map(s => ({
      ID: s.id,
      Name: s.name,
      MP: s.mpCost,
      Scope: s.scope,
      Mult: `${s.damageMultiplier}x`,
      Hits: s.hitCount,
      Move: s.moveType,
      Motion: s.motion,
    }))
  );
}

main().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
