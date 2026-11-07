"""Read-only dependency and bounded hash inventory; never infer deletion permission."""
from pathlib import Path
import hashlib,json,re,collections,argparse
from PIL import Image
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,default=Path('tools/data/roguelike-foundation-20261101'))
ROOT=Path('.');OUT=parser.parse_args().output
if not OUT.resolve().is_relative_to(Path('tools/data').resolve()):raise ValueError('Ignored audit output required')
OUT.mkdir(parents=True,exist_ok=True)
def sha(p):
 with p.open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
files=sorted(p for p in Path('src').rglob('*')if p.is_file());edges={}
for p in files:
 text=p.read_text(encoding='utf-8');targets=[]
 for name in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]",text):
  if not name.startswith('.'):continue
  base=p.parent/name
  for candidate in [base,base.with_suffix('.ts'),base.with_suffix('.mjs')]:
   if candidate.is_file():targets.append(candidate.resolve().relative_to(ROOT.resolve()).as_posix());break
 edges[p.as_posix()]=targets
reachable=set()
def visit(p):
 if p in reachable:return
 reachable.add(p)
 for t in edges.get(p,[]):visit(t)
visit('src/main.ts')
hashed=[];duplicates=collections.defaultdict(list)
selected=set(p for p in Path('public').rglob('*')if p.is_file())
selected|={p for root in ['assets/static_data','assets/audio']for p in Path(root).rglob('*')if p.is_file()}
for p in Path('tools/characters').glob('*.json'):
 recipe=json.loads(p.read_text(encoding='utf-8'));id=recipe['spriteUnitId']
 selected|={p for p in Path('ffbe_asset_dump-main/unit_animated_csv').glob('*_'+id+'.csv')}
 selected.add(Path('ffbe_asset_dump-main/unit_animated')/('unit_anime_'+id+'.png'))
for p in Path('tools/monsters').glob('*.json'):
 id=json.loads(p.read_text())['spriteId'];selected|=set(Path('ffbe_asset_dump-main/monster_animated_csv').glob('*_'+id+'.csv'))
 selected.add(Path('ffbe_asset_dump-main/monster_animated')/('monster_anime_'+id+'.png'))
for name in ['battle_bg_0003_01.jpg','battle_bg_0003_01.ssbp','battle_bg_0003_01_1.png','battle_bg_0003_01_2.png','battle_bg_2013_02.jpg','battle_bg_2013_02.ssbp','battle_bg_2013_01.png']:
 selected.add(Path('ffbe_asset_dump-main/battle_bg')/name)
for p in sorted(selected):
 if not p.is_file():continue
 h=sha(p);category='productive'if p.is_relative_to('public')else'original-reference'
 row={'path':p.as_posix(),'sha256':h,'bytes':p.stat().st_size,'category':category};hashed.append(row);duplicates[h].append(row['path'])
texture_headers=[]
for p in sorted(Path('public/assets').rglob('*.png')):
 with Image.open(p)as image:texture_headers.append({'path':p.as_posix(),'width':image.width,'height':image.height,'rgba8Bytes':image.width*image.height*4})
asset_counts=collections.Counter(p.suffix.lower()for p in Path('assets').rglob('*')if p.is_file())
receipts=[]
for name in ['barret-path-20261101','full-import-path-20261101','control-groups-20261101']:
 p=Path('tools/data')/name/'preservation.json'
 if p.exists():receipts.append({'receipt':p.as_posix(),'receiptSha256':sha(p),'retainedPriorVerifiedReceipt':json.loads(p.read_text())})
r={'schema':'game-foundation-audit-v1','sourceFiles':len(files),'staticImportGraph':edges,
 'notReachableFromMain':[p.as_posix()for p in files if p.suffix not in ['.mts']and p.as_posix()not in reachable],
 'hashes':hashed,'duplicateHashGroups':[{'sha256':h,'paths':v}for h,v in duplicates.items()if len(v)>1],
 'assetTreeExtensionCounts':dict(asset_counts),'researchArchives':receipts,'deletedFiles':[],
 'textureBudget':{'pngs':texture_headers,'sumRgba8Bytes':sum(x['rgba8Bytes']for x in texture_headers),
  'limits':['Header-based RGBA8 texel estimate across all prepared PNGs, not measured live VRAM.',
   'Does not account for lazy loading, shared GPU textures, compression, mipmaps or framebuffer overhead.']},
 'classification':{'public':'Productive prepared assets; registry/dynamic URLs remain references',
  'ffbe_asset_dump-main':'Original versions; selected recipe/stage inputs hashed, whole dump not certified',
  'assets':'Original DB/audio/effect package; audio codec/joins unconfirmed',
  'tools/data':'Generated previews, caches AND irreplaceable research/backup evidence; never bulk-delete',
  'dist':'Reproducible production build, separate from original data',
  'node_modules/.vite':'Development cache, not proof that running servers are current'},
 'limits':['Static imports do not prove exports unused; test pages and research entry points are separate roots.',
 'Hashes cover public, static DB/audio and registered/recipe unit raw sprite inputs, not the entire CPK/map dump.',
 'Other raw assets enumerated by extension; whole-dump integrity is NOT certified. Prior archive readback receipts reused.',
 'Duplicates are observations, not deletion candidates; URLs, source identity and archive dependencies must be preserved.']}
(OUT/'architecture-assets.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps({'sourceFiles':len(files),'hashes':len(hashed),'duplicateGroups':len(r['duplicateHashGroups']),'notReachable':r['notReachableFromMain'],'deleted':0}))
