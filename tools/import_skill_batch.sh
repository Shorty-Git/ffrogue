#!/bin/sh
# Batch skill import through the authoring-free path (local only; needs tools/data and rawdata/).
# Each line of the batch file: character skillId id key [draft options...]
#   e.g.  aerith 10290 curaja aerith_curaja --heal 900
#   sh tools/import_skill_batch.sh <batch.txt> <run-dir under tools/data>
# Steps per skill: compose -> resolve -> stage -> draft recipe entry -> prepare (approximation)
# -> presentation recipe -> publish; then import_character per touched character.
set -u
BATCH=$1; RUN=$2
PY=${FFROGUE_PYTHON:-C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe}
export PYTHONUTF8=1 PYTHONPATH='tools;tools/memorial'
CHARS=""
while read -r CHAR SID ID KEY REST; do
  [ -z "$CHAR" ] && continue
  case "$CHAR" in \#*) continue;; esac
  D=$RUN/$ID; mkdir -p "$D"
  U=$(node -e "console.log(JSON.parse(require('fs').readFileSync('tools/characters/$CHAR.json')).spriteUnitId)")
  KIND=$(node -e "const r=JSON.parse(require('fs').readFileSync('tools/data/characters/$CHAR/report.json'));const s=r.catalog.find(s=>String(s.id)==='$SID');console.log(s?.kind??'ABILITY')")
  if [ "$KIND" = "ABILITY" ]; then
    "$PY" tools/compose_skill_effects.py --unit-id "$U" --skill-id "$SID" --output "$D/composition.json" >"$D/compose.log" 2>&1 \
      && node tools/resolve_composed_skill.mjs --composition "$D/composition.json" --report "tools/data/characters/$CHAR/report.json" --output "$D/composed-report.json" >>"$D/compose.log" 2>&1 \
      && "$PY" tools/stage_original_skill.py --report "$D/composed-report.json" --skill-id "$SID" --output "$D/source" >>"$D/compose.log" 2>&1 \
      || { echo "SKIP $ID: compose/stage: $(grep -m1 -E 'Error|error:' "$D/compose.log")"; continue; }
  else
    "$PY" tools/stage_original_skill.py --report "tools/data/characters/$CHAR/report.json" --skill-id "$SID" --kind "$KIND" --output "$D/source" >"$D/compose.log" 2>&1 \
      || { echo "SKIP $ID: stage: $(grep -m1 -E 'Error|error:' "$D/compose.log")"; continue; }
  fi
  node tools/draft_skill_entry.mjs --character "$CHAR" --source "$D/source/skill-source.json" --id "$ID" --key "$KEY" $REST >/dev/null || { echo "SKIP $ID: draft failed"; continue; }
  CLIP=$(node -e "const r=JSON.parse(require('fs').readFileSync('tools/characters/$CHAR.json'));console.log(r.skills.find(s=>s.id==='$ID').motion)")
  "$PY" tools/prepare_original_preview.py --source "$D/source/skill-source.json" --unit "$CHAR" --motion "$CLIP" --recipe "tools/characters/$CHAR.json" \
    --profile source-preview-v1 --authoring-directory rawdata/assets/battle_effect --native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk \
    --native-shader-package tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json \
    --approximate-unverified --output "$D/source/plan.json" >"$D/prepare.log" 2>&1 || { echo "SKIP $ID: prepare: $(tail -1 "$D/prepare.log")"; continue; }
  REC=tools/presentations/$(echo "$KEY" | tr '_' '-').json
  node -e "const fs=require('fs');fs.writeFileSync('$REC',JSON.stringify({schemaVersion:1,quality:'experimental-preview',reviewNote:'Batch authoring-free import via tools/import_skill_batch.sh; unsupported node-type subtrees omitted under --approximate-unverified. Visual acceptance bar per docs/vision.md.',bindings:[{key:'$KEY',standalone:true,sourceId:$SID,plan:'$D/source/plan.json',placementCoordinates:'ffbe-screen-api',placementReview:'Exact source group anchors through shared native screen-down semantics per native-effect-placement.md; anchor mode 3 as caster-unit under --approximate-unverified. Visual acceptance, not native placement proof.'}]},null,2)+'\n')"
  node tools/publish_scene_presentations.mjs --recipe "$REC" --python "$PY" >"$D/publish.log" 2>&1 || { echo "SKIP $ID: publish: $(grep -m1 Error "$D/publish.log")"; rm -f "$REC"; continue; }
  echo "OK $CHAR $ID"; CHARS="$CHARS $CHAR"
done < "$BATCH"
for C in $(echo $CHARS | tr ' ' '\n' | sort -u); do
  node tools/import_character.mjs --recipe "tools/characters/$C.json" --publish-skills-only --python "$PY" >/dev/null 2>&1 \
    && echo "PUBLISHED $C" || { echo "BLOCKED $C:"; grep -h "blocked" "tools/data/characters/$C/report.md" | head -5; }
done
