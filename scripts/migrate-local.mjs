import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const built=resolve('dist/server/wrangler.json');
if(!existsSync(built))throw new Error('Run npm run build first.');
const config=JSON.parse(readFileSync(built,'utf8'));
if(!config.d1_databases?.length)throw new Error('DB binding missing.');
config.d1_databases[0].migrations_dir=resolve('drizzle');
mkdirSync('.sites-runtime',{recursive:true});
const temp=resolve('.sites-runtime/migration-config.json');
// Only D1 is needed; never copy Worker asset paths into a different directory.
writeFileSync(temp,JSON.stringify({name:'ustoz-local-migrations',compatibility_date:'2026-05-15',d1_databases:config.d1_databases}));
const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',temp,'--persist-to',process.env.USTOZ_LOCAL_STATE_DIR||'.wrangler/state'],{stdio:'inherit'});
process.exit(r.status??1);
