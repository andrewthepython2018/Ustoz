import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',process.env.USTOZ_LOCAL_STATE_DIR||'.wrangler/state','--ip','127.0.0.1','--port','5179','--inspector-port','0'],{stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
try{
 let ready=false;for(let i=0;i<90;i++){if(child.exitCode!==null)throw new Error(output);try{const r=await fetch('http://127.0.0.1:5179/api/health');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500));}
 if(!ready)throw new Error('Preview failed to start: '+output);
 const test=spawn(process.execPath,['tests/integration.mjs'],{env:{...process.env,TEST_BASE_URL:'http://127.0.0.1:5179'},stdio:'inherit'});
 const code=await new Promise(resolve=>test.on('exit',resolve));if(code!==0){console.error(output);process.exitCode=Number(code)||1;}
}catch(e){console.error(e);process.exitCode=1}finally{child.kill()}
