import {env} from 'cloudflare:workers';
import {all,one,run,uid,now,str,choice,fail,response,currentUser,imageUrl,workspaceCookie,rateLimit} from './server';
import {cities} from './catalog';
export async function checkPhoto(value:unknown,owner:string){
 if(value===null||value==='')return null;
 const key=str(value,1,250);
 if(!await one('SELECT key FROM media WHERE key=? AND owner_id=?',key,owner))fail(400,'Фотография не найдена в вашем хранилище');
 return key;
}
export async function readMedia(req:Request){
 const key=new URL(req.url).searchParams.get('key')||'';
 const asset=await one('SELECT * FROM media WHERE key=?',key);if(!asset)fail(404,'Изображение не найдено');
 const visible=await one(`SELECT l.id FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.active=1 AND (l.photo_key=? OR (l.photo_key IS NULL AND u.photo_key=?)) LIMIT 1`,key,key);
 const u=await currentUser(req);if(!visible&&u?.account_id!==asset.owner_id)fail(404,'Изображение не найдено');
 const file=await env.BUCKET?.get(key);if(!file)fail(404,'Изображение не найдено');
 return new Response(file!.body,{headers:{'Content-Type':asset.content_type,'X-Content-Type-Options':'nosniff','Cache-Control':visible?'public, max-age=300':'private, no-store'}});
}
export async function uploadMedia(req:Request,u:any){
 if(!env.BUCKET)fail(503,'Хранилище не подключено');await rateLimit(req,'photos',50);
 const form=await req.formData(),file=form.get('file');if(!(file instanceof File))fail(400,'Выберите фотографию');
 const f=file as File;if(f.size===0||f.size>5*1024*1024)fail(400,'Фотография должна быть не больше 5 МБ');
 const bytes=new Uint8Array(await f.arrayBuffer());let type='',extension='';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255){type='image/jpeg';extension='jpg';}
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)){type='image/png';extension='png';}
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'){type='image/webp';extension='webp';}
 if(!type)fail(400,'Нужен файл JPG, PNG или WebP. SVG и другие форматы не поддерживаются.');
 const key='photos/'+u.account_id+'/'+uid()+'.'+extension;
 await env.BUCKET!.put(key,bytes,{httpMetadata:{contentType:type}});
 try{await run('INSERT INTO media(key,owner_id,content_type,created_at) VALUES(?,?,?,?)',key,u.account_id,type,now())}catch(e){await env.BUCKET!.delete(key);throw e}
 return response({key,url:imageUrl(key)},201);
}
async function accounts(owner:string){return (await all(`SELECT u.id,u.name,u.role,u.city,u.bio,u.phone,u.photo_key,u.managed_by,(SELECT COUNT(*) FROM listings WHERE owner_id=u.id) listings_count,(SELECT COUNT(*) FROM listings WHERE owner_id=u.id AND active=1) published_count FROM users u WHERE u.id=? OR u.managed_by=? ORDER BY u.managed_by IS NOT NULL,u.created_at,u.id`,owner,owner)).map(u=>({...u,photo_url:imageUrl(u.photo_key)}))}
export async function accountRoute(req:Request,path:string[],method:string,u:any){
 const owner=u.account_id;
 if(method==='GET'&&!path[1])return response({accounts:await accounts(owner),currentId:u.id});
 if(method==='POST'&&path[1]==='switch'){
  const b=await req.json() as any;const next=await one('SELECT id FROM users WHERE id=? AND (id=? OR managed_by=?)',str(b.id),owner,owner);if(!next)fail(404,'Кабинет не найден');
  return response({ok:true},200,{'Set-Cookie':workspaceCookie(next.id,req)});
 }
 if(method==='POST'&&!path[1]){
  await rateLimit(req,'accounts',30);if((await accounts(owner)).length>=30)fail(400,'Достигнут лимит кабинетов');
  const b=await req.json() as any,id=uid(),photo=b.photoKey?await checkPhoto(b.photoKey,owner):null;
  await run('INSERT INTO users(id,email,name,role,city,bio,phone,photo_key,managed_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',id,'managed-'+id+'@profiles.ustoz.invalid',str(b.name,2,100),choice(b.role,['tutor','center']),choice(b.city,cities),str(b.bio||'',0,2000),str(b.phone||'',0,30),photo,owner,now());
  return response({id},201);
 }
 if(method==='PATCH'&&path[1]){
  const profile=await one('SELECT * FROM users WHERE id=? AND (id=? OR managed_by=?)',path[1],owner,owner);if(!profile)fail(404,'Кабинет не найден');
  const b=await req.json() as any,photo=b.photoKey===undefined?profile.photo_key:await checkPhoto(b.photoKey,owner);
  await run('UPDATE users SET name=?,city=?,bio=?,phone=?,photo_key=? WHERE id=?',str(b.name,2,100),choice(b.city,cities),str(b.bio||'',0,2000),str(b.phone||'',0,30),photo,profile.id);
  return response({ok:true});
 }
 fail(405,'Метод не поддерживается');
}
