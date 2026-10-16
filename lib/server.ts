import { env } from 'cloudflare:workers';
export function db(): D1Database { if (!env.DB) throw new Error('Database is not configured'); return env.DB; }
export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export class ApiError extends Error { constructor(public status:number,message:string){super(message)} }
export const fail = (status:number,message:string):never => {throw new ApiError(status,message)};
export const one = async (sql:string,...args:unknown[]) => db().prepare(sql).bind(...args).first<any>();
export const all = async (sql:string,...args:unknown[]) => (await db().prepare(sql).bind(...args).all<any>()).results;
export const run = (sql:string,...args:unknown[]) => db().prepare(sql).bind(...args).run();
export const str=(v:unknown,min=1,max=500) => {if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(400,`Введите текст от ${min} до ${max} символов`); return (v as string).trim()};
export const choice=(v:unknown,values:string[]) => {if(typeof v!=='string'||!values.includes(v))fail(400,'Недопустимое значение');return v as string};
export const num=(v:unknown,min:number,max:number)=>{const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)fail(400,`Значение должно быть от ${min} до ${max}`);return n};
export const iso=(v:unknown)=>{const d=new Date(String(v));if(!Number.isFinite(d.getTime()))fail(400,'Некорректная дата');return d.toISOString()};
export async function passwordHash(password:string,salt:string){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
  return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function digest(token:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
export const imageUrl=(key:string|null|undefined)=>key?'/api/media?key='+encodeURIComponent(key):undefined;
export const cookieValue=(req:Request,name:string)=>req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
export const workspaceCookie=(id:string,req:Request)=>`ustoz_workspace=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=1209600${new URL(req.url).protocol==='https:'?'; Secure':''}`;
export async function getAuthAccount(req:Request){
  const cookie=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ustoz_session='))?.slice(14);
  if(cookie){const user=await one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?',await digest(cookie),now());if(user)return user;}
  const id=env.TRUST_SITES_IDENTITY==='true'?req.headers.get('oai-authenticated-user-id'):null;
  return id ? await one('SELECT * FROM users WHERE id=?','siwc:'+id) : null;
}
export async function currentUser(req:Request){
 const account=await getAuthAccount(req);if(!account)return null;
 const active=cookieValue(req,'ustoz_workspace');
 const profile=active&&active!==account.id?await one('SELECT * FROM users WHERE id=? AND managed_by=?',active,account.id):null;
 return {...(profile||account),account_id:account.id,account_name:account.name,account_email:account.email};
}
export async function requireUser(req:Request){const u=await currentUser(req);if(!u)fail(401,'Войдите в аккаунт');return u;}
export function publicUser(u:any){if(!u)return null;const {password_hash,salt,account_email,...safe}=u;return {...safe,email:account_email||safe.email,photo_url:imageUrl(u.photo_key)}}
export async function session(userId:string,req:Request){const token=uid()+uid();await run('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)',await digest(token),userId,new Date(Date.now()+86400000*14).toISOString());return `ustoz_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=1209600${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
export async function rateLimit(req:Request,bucket:string,limit=15){
  const key=bucket+':'+(req.headers.get('cf-connecting-ip')||'local');const reset=Date.now()+900000;
  const row=await one('INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END RETURNING count',key,reset,Date.now(),Date.now(),reset);
  if(row.count>limit)fail(429,'Слишком много попыток. Попробуйте через 15 минут.');
}
export async function relation(userId:string,otherId:string){return one(`SELECT b.id FROM bookings b JOIN slots s ON s.id=b.slot_id JOIN listings l ON l.id=s.listing_id WHERE (b.student_id=? AND l.owner_id=?) OR (b.student_id=? AND l.owner_id=?) LIMIT 1`,userId,otherId,otherId,userId)}
export async function bookingFor(id:string,u:any){const b=await one('SELECT b.*,s.starts_at,s.ends_at,l.owner_id,l.title,l.id listing_id FROM bookings b JOIN slots s ON s.id=b.slot_id JOIN listings l ON l.id=s.listing_id WHERE b.id=?',id);if(!b||(b.student_id!==u.id&&b.owner_id!==u.id))fail(404,'Занятие не найдено');return b}
export function checkOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)fail(403,'Недопустимый источник запроса');if(req.headers.get('sec-fetch-site')==='cross-site')fail(403,'Недопустимый источник запроса')}
export function response(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}})}
export function errorResponse(e:unknown){if(e instanceof ApiError)return response({error:e.message},e.status); console.error(e);return response({error:'Не удалось выполнить действие. Попробуйте ещё раз.'},500)}
