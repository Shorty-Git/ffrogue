import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceAudioPlan} from './source-audio-events.mjs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const review = read(new URL('../presentations/source-audio-review.json', import.meta.url));
export const audioFingerprint = audio => sha256(JSON.stringify([audio.coverage, audio.sourceGroups]));
export const audioClockFingerprint = manifest => sha256(JSON.stringify([
  manifest.provenance.planSha256, manifest.plan.members,
]));

export function admitSourceAudio(manifest) {
  const identity = review.presentations[manifest.key];
  if (!identity) return;
  let audio = manifest.audioSource;
  if (identity.clockSha256 && identity.clockSha256 !== audioClockFingerprint(manifest)) {
    throw Error('Source audio visual clock does not match ' + manifest.key);
  }
  // Older visual exports can omit audio metadata. Recover only a separately reviewed complete group list.
  if (identity.sourceGroups && !audio.sourceGroups.length && audio.coverage === 'legacy-partial-groups') {
    audio = sourceAudioPlan(identity.sourceGroups,'all-resolved-effect-groups-only');
  }
  if (identity.sourceId !== manifest.sourceId || identity.sha256 !== audioFingerprint(audio)
      || audio.issues.length || !audio.events.length) {
    throw Error('Source audio review does not match ' + manifest.key);
  }
  const events = audio.events.map(event => {
    const [bankClass] = event.rawParameters;
    // This reviewed subset only admits the native common-bank branch.
    if (event.rawParameters.length > 1 || (bankClass !== undefined && bankClass !== '1')
        || event.frame >= manifest.durationFrames) {
      throw Error('Unsupported Source audio event in ' + manifest.key);
    }
    const key = 'SE:' + event.sourceSoundId;
    const asset = review.cues[key];
    if (!asset) throw Error('Missing decoded Source cue ' + key);
    const uri = '/assets/audio/combat/' + asset.file + '.wav';
    if (sha256(fs.readFileSync('public' + uri)) !== asset.sha256) throw Error('Stale decoded Source cue ' + key);
    return {...event, resource:{key, uri, sha256:asset.sha256, format:'wav'}};
  });
  manifest.audioSource = {...audio, events, playbackSupported:true,
    timingBasis:'Reviewed composed effect-group offsets; native common-bank dispatch'};
}
