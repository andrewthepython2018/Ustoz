import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const run=args=>{const r=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(r.status!==0)process.exit(r.status??1)};
const cfg=existsSync('deployment.config.json')?JSON.parse(readFileSync('deployment.config.json','utf8')):{databaseId:process.env.D1_DATABASE_ID,databaseName:process.env.D1_DATABASE_NAME||'ustoz-db',bucketName:process.env.R2_BUCKET_NAME||'ustoz-files',workerName:process.env.WORKER_NAME||'ustoz'};
if(!/^[0-9a-f-]{36}$/i.test(cfg.databaseId||''))throw new Error('Copy deployment.config.json.example to deployment.config.json and enter your Cloudflare D1 database ID.');
if(!/^[a-z0-9-]+$/.test(cfg.bucketName||'')||!/^[a-z0-9-]+$/.test(cfg.workerName||''))throw new Error('Invalid worker or bucket name.');
run(['scripts/run-framework.mjs','build']);
const file='dist/server/wrangler.json',config=JSON.parse(readFileSync(file,'utf8'));
config.name=cfg.workerName;config.workers_dev=true;
config.d1_databases=[{binding:'DB',database_name:cfg.databaseName,database_id:cfg.databaseId,migrations_dir:'../../drizzle'}];
config.r2_buckets=[{binding:'BUCKET',bucket_name:cfg.bucketName}];
// Only Sites dispatch may supply trusted identity headers. Standalone Workers use email sessions.
config.vars={...config.vars,TRUST_SITES_IDENTITY:'false'};
writeFileSync(file,JSON.stringify(config,null,2));
run(['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--remote','--config',file]);
run(['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','deploy','--config',file]);
