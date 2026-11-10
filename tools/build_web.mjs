// Web (alpha) build: the normal production build, then the music converted to Ogg Vorbis
// (tools/web_audio.py, ~330 MB of WAV -> ~40 MB). Python needs the `soundfile` package; set
// FFROGUE_PYTHON when the interpreter on PATH does not have it.
//
//   node tools/build_web.mjs        -> dist/ ready for a static host (vite preview to check it)
import {spawnSync} from 'node:child_process';

const run=(command,args)=>{
 const result=spawnSync(command,args,{stdio:'inherit',shell:process.platform==='win32'});
 if(result.status!==0)process.exit(result.status??1);
};
run('npm',['run','build']);
run(process.env.FFROGUE_PYTHON||'python',['tools/web_audio.py','dist']);
