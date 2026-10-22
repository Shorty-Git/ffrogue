// Compatibility entry point; the reusable exporter owns all baking logic.
if (!process.argv.includes('--recipe')) process.argv.push('--recipe', 'tools/effects/brave_slash.json');
await import('./export_effect.mjs');
