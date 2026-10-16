import { env } from 'cloudflare:workers';
import { demoListings, subjects, cities, languages } from '@/lib/catalog';
import { all, one, run, db, now, uid, str, num, iso, choice, currentUser, requireUser, publicUser, passwordHash, session, digest, fail, rateLimit, relation, bookingFor, checkOrigin, response, errorResponse } from '@/lib/server';

export const dynamic='force-dynamic';
async function handler(req:Request){
 try{
  const url=new URL(req.url), path=url.pathname.replace(/^\/api\//,'').split('/'), method=req.method;
  if(method!=='GET')checkOrigin(req);
  if(path[0]==='health') return response({ok:true,version:'1.0.0',timezone:'Asia/Tashkent'});
  if(path[0]==='catalog'&&method==='GET'){
   const rows=await all(`SELECT l.*,u.name,u.role,COALESCE(AVG(r.rating),0) rating,COUNT(r.id) review_count FROM listings l JOIN users u ON u.id=l.owner_id LEFT JOIN reviews r ON r.listing_id=l.id WHERE l.active=1 GROUP BY l.id ORDER BY l.created_at DESC`);
   return response({listings:[...rows,...demoListings]});
  }
  if(path[0]==='me'&&method==='GET'){
   const u=await currentUser(req),sitesAuth=env.TRUST_SITES_IDENTITY==='true';return response({user:publicUser(u),identity:!u&&sitesAuth&&req.headers.get('oai-authenticated-user-id')?{email:req.headers.get('oai-authenticated-user-email'),name:req.headers.get('oai-authenticated-user-full-name')}:null,sitesAuth});
  }
  if(path[0]==='auth'){
   if(method!=='POST')fail(405,'Метод не поддерживается');
   if(path[1]==='logout'){
    const token=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ustoz_session='))?.slice(14);
    if(token)await run('DELETE FROM sessions WHERE token=?',await digest(token));
    return response({ok:true},200,{'Set-Cookie':'ustoz_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});
   }
   await rateLimit(req,'auth',20);const body=await req.json() as any;
   const email=str(body.email,5,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Укажите корректный email');
   const password=str(body.password,8,128);
   if(path[1]==='register'){
    const name=str(body.name,2,100),role=choice(body.role,['student','tutor','center']);
    if(await one('SELECT id FROM users WHERE email=?',email))fail(409,'Этот email уже зарегистрирован');
    const id=uid(),salt=uid(),hash=await passwordHash(password,salt);
    await run('INSERT INTO users(id,email,name,role,password_hash,salt,created_at) VALUES(?,?,?,?,?,?,?)',id,email,name,role,hash,salt,now());
    return response({user:publicUser(await one('SELECT * FROM users WHERE id=?',id))},201,{'Set-Cookie':await session(id,req)});
   }
   if(path[1]==='login'){
    const u=await one('SELECT * FROM users WHERE email=?',email);
    // Equal-cost hash for unknown accounts to reduce account enumeration via timing.
    const hash=await passwordHash(password,u?.salt??'unknown-account-salt');
    if(!u?.password_hash||hash!==u.password_hash)fail(401,'Неверный email или пароль');
    return response({user:publicUser(u)},200,{'Set-Cookie':await session(u.id,req)});
   }
   fail(404,'Не найдено');
  }
  if(path[0]==='listing'&&method==='GET'){
   const id=path[1];const d=demoListings.find(x=>x.id===id);if(d)return response({listing:d,slots:[],reviews:[]});
   const listing=await one('SELECT l.*,u.name,u.role,COALESCE((SELECT AVG(rating) FROM reviews WHERE listing_id=l.id),0) rating,(SELECT COUNT(*) FROM reviews WHERE listing_id=l.id) review_count FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=? AND l.active=1',id);
   if(!listing)fail(404,'Предложение не найдено');
   const slots=await all(`SELECT s.*,s.capacity-(SELECT COUNT(*) FROM bookings b WHERE b.slot_id=s.id AND b.status<>'cancelled') seats_left FROM slots s WHERE s.listing_id=? AND s.starts_at>? AND (SELECT COUNT(*) FROM bookings b WHERE b.slot_id=s.id AND b.status<>'cancelled')<s.capacity ORDER BY s.starts_at LIMIT 100`,id,now());
   const reviews=await all('SELECT r.*,u.name FROM reviews r JOIN users u ON u.id=r.student_id WHERE r.listing_id=? ORDER BY r.created_at DESC',id);
   return response({listing,slots,reviews});
  }
  if(path[0]==='profile'&&method==='POST'){
   const body=await req.json() as any,id=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');
   if(env.TRUST_SITES_IDENTITY!=='true'||!id||!email)fail(401,'Войдите через ChatGPT или зарегистрируйтесь по email');
   if(await one('SELECT id FROM users WHERE id=?','siwc:'+id))fail(409,'Профиль уже создан');
   await run('INSERT INTO users(id,email,name,role,created_at) VALUES(?,?,?,?,?)','siwc:'+id,email!.toLowerCase(),str(body.name,2,100),choice(body.role,['student','tutor','center']),now());
   return response({user:publicUser(await one('SELECT * FROM users WHERE id=?','siwc:'+id))},201);
  }
  const u=await requireUser(req);
  if(path[0]==='profile'&&method==='PATCH'){
   const b=await req.json() as any;await run('UPDATE users SET name=?,phone=?,city=?,bio=? WHERE id=?',str(b.name,2,100),str(b.phone,0,30),choice(b.city,cities),str(b.bio,0,2000),u.id);
   return response({user:publicUser(await one('SELECT * FROM users WHERE id=?',u.id))});
  }
  if(path[0]==='workspace'&&method==='GET'){
   const lessons=await all(`SELECT b.*,s.starts_at,s.ends_at,l.title,l.subject,l.kind,l.price,l.owner_id,l.id listing_id,teacher.name teacher_name,student.name student_name FROM bookings b JOIN slots s ON s.id=b.slot_id JOIN listings l ON l.id=s.listing_id JOIN users teacher ON teacher.id=l.owner_id JOIN users student ON student.id=b.student_id WHERE b.student_id=? OR l.owner_id=? ORDER BY s.starts_at`,u.id,u.id);
   const assignments=await all(`SELECT a.*,b.student_id,l.owner_id,l.subject,l.title course_title,student.name student_name,sub.id submission_id,sub.body answer,sub.file_key,sub.file_name,sub.grade,sub.feedback,sub.submitted_at FROM assignments a JOIN bookings b ON b.id=a.booking_id JOIN slots s ON s.id=b.slot_id JOIN listings l ON l.id=s.listing_id JOIN users student ON student.id=b.student_id LEFT JOIN submissions sub ON sub.assignment_id=a.id WHERE b.student_id=? OR l.owner_id=? ORDER BY a.due_at`,u.id,u.id);
   const listings=await all('SELECT * FROM listings WHERE owner_id=? ORDER BY created_at DESC',u.id);
   const available=await all(`SELECT s.*,l.title,s.capacity-(SELECT COUNT(*) FROM bookings b WHERE b.slot_id=s.id AND b.status<>'cancelled') seats_left FROM slots s JOIN listings l ON l.id=s.listing_id WHERE l.owner_id=? AND s.starts_at>? AND (SELECT COUNT(*) FROM bookings b WHERE b.slot_id=s.id AND b.status<>'cancelled')<s.capacity ORDER BY s.starts_at`,u.id,now());
   const contacts=await all(`SELECT DISTINCT p.id,p.name,p.role,(SELECT COUNT(*) FROM messages m WHERE m.sender_id=p.id AND m.recipient_id=? AND m.read_at IS NULL) unread,(SELECT m.body FROM messages m WHERE (m.sender_id=p.id AND m.recipient_id=?) OR (m.recipient_id=p.id AND m.sender_id=?) ORDER BY m.created_at DESC LIMIT 1) last_message FROM users p WHERE p.id<>? AND (p.id IN (SELECT sender_id FROM messages WHERE recipient_id=?) OR p.id IN (SELECT recipient_id FROM messages WHERE sender_id=?) OR p.id IN (SELECT b.student_id FROM bookings b JOIN slots s ON s.id=b.slot_id JOIN listings l ON l.id=s.listing_id WHERE l.owner_id=?) OR p.id IN (SELECT l.owner_id FROM bookings b JOIN slots s ON s.id=b.slot_id JOIN listings l ON l.id=s.listing_id WHERE b.student_id=?))`,u.id,u.id,u.id,u.id,u.id,u.id,u.id,u.id);
   return response({lessons,assignments,listings,available,contacts,favorites:(await all('SELECT listing_id FROM favorites WHERE user_id=?',u.id)).map(x=>x.listing_id)});
  }
  if(path[0]==='favorites'&&method==='POST'){
   const b=await req.json() as any,id=str(b.listingId);
   if(!demoListings.some(x=>x.id===id)&&!await one('SELECT id FROM listings WHERE id=? AND active=1',id))fail(404,'Предложение не найдено');
   if(b.saved)await run('INSERT OR IGNORE INTO favorites(user_id,listing_id) VALUES(?,?)',u.id,id);else await run('DELETE FROM favorites WHERE user_id=? AND listing_id=?',u.id,id);
   return response({ok:true});
  }
  if(path[0]==='listings'){
   if(!['tutor','center'].includes(u.role))fail(403,'Предложение может создать преподаватель или центр');
   if(method==='DELETE') {const r=await run('UPDATE listings SET active=0 WHERE id=? AND owner_id=?',path[1],u.id);if(!r.meta.changes)fail(404,'Не найдено');return response({ok:true});}
   if(method==='POST'||method==='PATCH'){
    const b=await req.json() as any;
    const vals=[str(b.title,5,140),choice(b.subject,subjects),choice(b.language,languages),choice(b.city,cities),choice(b.format,['Онлайн','Очно','Гибрид']),num(b.price,1000,100000000),num(b.duration,15,240),str(b.description,30,4000),str(b.level,2,100),num(b.experience,0,60)];
    if(method==='PATCH') {const r=await run('UPDATE listings SET title=?,subject=?,language=?,city=?,format=?,price=?,duration=?,description=?,level=?,experience=? WHERE id=? AND owner_id=?',...vals,path[1],u.id);if(!r.meta.changes)fail(404,'Не найдено');return response({ok:true});}
    await rateLimit(req,'listing',30);const id=uid();await run('INSERT INTO listings(title,subject,language,city,format,price,duration,description,level,experience,id,owner_id,kind,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',...vals,id,u.id,u.role==='center'?'course':'tutor',now());return response({id},201);
   }
  }
  if(path[0]==='slots'&&method==='POST'){
   const b=await req.json() as any;const l=await one('SELECT * FROM listings WHERE id=? AND owner_id=? AND active=1',str(b.listingId),u.id);if(!l)fail(403,'Предложение не найдено');
   const start=iso(b.startsAt),end=new Date(Date.parse(start)+l.duration*60000).toISOString();if(start<now())fail(400,'Выберите будущее время');
   const capacity=u.role==='center'?num(b.capacity||1,1,30):1;
   const id=uid();const r=await run(`INSERT INTO slots(id,listing_id,starts_at,ends_at,capacity) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM slots s JOIN listings l ON l.id=s.listing_id WHERE l.owner_id=? AND s.starts_at<? AND s.ends_at>?)`,id,l.id,start,end,capacity,u.id,end,start);
   if(!r.meta.changes)fail(409,'В это время уже есть занятие или свободный слот');return response({id},201);
  }
  if(path[0]==='slots'&&method==='DELETE'){
   const r=await run(`DELETE FROM slots WHERE id=? AND listing_id IN (SELECT id FROM listings WHERE owner_id=?) AND NOT EXISTS(SELECT 1 FROM bookings WHERE slot_id=slots.id)`,path[1],u.id);if(!r.meta.changes)fail(409,'Этот слот нельзя удалить: он занят или недоступен');return response({ok:true});
  }
  if(path[0]==='bookings'&&method==='POST'){
   if(u.role!=='student')fail(403,'Запись доступна из кабинета ученика');const b=await req.json() as any;
   const slot=await one('SELECT s.*,l.owner_id FROM slots s JOIN listings l ON l.id=s.listing_id WHERE s.id=? AND l.active=1',str(b.slotId));if(!slot||slot.starts_at<now())fail(400,'Время уже недоступно');
   const id=uid();try {
    const r=await run(`INSERT INTO bookings(id,slot_id,student_id,status,created_at) SELECT ?,?,?,'confirmed',? WHERE NOT EXISTS(SELECT 1 FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE b.student_id=? AND b.status<>'cancelled' AND s.starts_at<? AND s.ends_at>?) AND (SELECT COUNT(*) FROM bookings WHERE slot_id=? AND status<>'cancelled')<?`,id,slot.id,u.id,now(),u.id,slot.ends_at,slot.starts_at,slot.id,slot.capacity);
    if(!r.meta.changes)fail(409,'Время занято или у вас уже есть занятие в это время');
   }catch(e:any){if(String(e.message).includes('UNIQUE'))fail(409,'Это время только что забронировали. Выберите другое.');throw e;}
   return response({id},201);
  }
  if(path[0]==='bookings'&&method==='PATCH'){
   const b=await req.json() as any,lesson=await bookingFor(path[1],u);
   if(b.status==='cancelled'){
    if(lesson.starts_at<now()||lesson.status!=='confirmed')fail(400,'Нельзя отменить прошедшее занятие');await run("UPDATE bookings SET status='cancelled' WHERE id=?",lesson.id);
   }else if(b.status==='completed'){
    if(lesson.owner_id!==u.id)fail(403,'Только преподаватель может завершить занятие');if(lesson.ends_at>now()||lesson.status!=='confirmed')fail(400,'Занятие ещё не закончилось');await run("UPDATE bookings SET status='completed' WHERE id=?",lesson.id);
   }else if(b.meetingUrl!==undefined){
    if(lesson.owner_id!==u.id)fail(403,'Недостаточно прав');let link=str(b.meetingUrl,0,1000);if(link&&(!URL.canParse(link)||new URL(link).protocol!=='https:'))fail(400,'Нужна ссылка с https://');await run('UPDATE bookings SET meeting_url=? WHERE id=?',link,lesson.id);
   }else fail(400,'Неизвестное действие');return response({ok:true});
  }
  if(path[0]==='assignments'&&method==='POST'){
   const b=await req.json() as any,lesson=await bookingFor(str(b.bookingId),u);if(lesson.owner_id!==u.id||lesson.status==='cancelled')fail(403,'Вы не можете выдать задание');
   const id=uid();await run('INSERT INTO assignments(id,booking_id,title,body,due_at,created_at) VALUES(?,?,?,?,?,?)',id,lesson.id,str(b.title,3,150),str(b.body,5,6000),iso(b.dueAt),now());return response({id},201);
  }
  if(path[0]==='submissions'&&method==='POST'){
   const b=await req.json() as any,a=await one('SELECT a.*,b.student_id,b.status FROM assignments a JOIN bookings b ON b.id=a.booking_id WHERE a.id=?',str(b.assignmentId));
   if(!a||a.student_id!==u.id||a.status==='cancelled')fail(403,'Задание недоступно');
   const existing=await one('SELECT grade FROM submissions WHERE assignment_id=?',a.id);if(existing?.grade!==null&&existing?.grade!==undefined)fail(409,'Работа уже оценена');
   let key=b.fileKey?str(b.fileKey):null,fileName=b.fileName?str(b.fileName,1,200):null;
   if(key&&(!key.startsWith(u.id+'/')||!await env.BUCKET?.head(key)))fail(400,'Файл не найден');
   await run('INSERT INTO submissions(id,assignment_id,student_id,body,file_key,file_name,submitted_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(assignment_id) DO UPDATE SET body=excluded.body,file_key=excluded.file_key,file_name=excluded.file_name,submitted_at=excluded.submitted_at',uid(),a.id,u.id,str(b.body,1,10000),key,fileName,now());return response({ok:true});
  }
  if(path[0]==='submissions'&&method==='PATCH'){
   const b=await req.json() as any;const sub=await one('SELECT sub.id,l.owner_id FROM submissions sub JOIN assignments a ON a.id=sub.assignment_id JOIN bookings b ON b.id=a.booking_id JOIN slots s ON s.id=b.slot_id JOIN listings l ON l.id=s.listing_id WHERE sub.id=?',path[1]);
   if(!sub||sub.owner_id!==u.id)fail(403,'Работа недоступна');await run('UPDATE submissions SET grade=?,feedback=? WHERE id=?',num(b.grade,0,100),str(b.feedback,1,4000),sub.id);return response({ok:true});
  }
  if(path[0]==='files'&&method==='POST'){
   if(!env.BUCKET)fail(503,'Хранилище не подключено');await rateLimit(req,'upload',30);
   const form=await req.formData(),file=form.get('file');if(!(file instanceof File))fail(400,'Выберите файл');
   const f=file as File;if(f.size>10*1024*1024||f.size===0)fail(400,'Размер файла: от 1 байта до 10 МБ');
   const ext=f.name.split('.').pop()?.toLowerCase();if(!['pdf','docx','txt','png','jpg','jpeg','webp','zip'].includes(ext||''))fail(400,'Разрешены PDF, DOCX, TXT, изображения и ZIP');
   const key=u.id+'/'+uid()+'.'+ext;await env.BUCKET!.put(key,await f.arrayBuffer(),{httpMetadata:{contentType:'application/octet-stream'}});return response({key,name:f.name},201);
  }
  if(path[0]==='files'&&method==='GET'){
   const key=url.searchParams.get('key')||'';
   const allowed=await one(`SELECT sub.file_name FROM submissions sub JOIN assignments a ON a.id=sub.assignment_id JOIN bookings b ON b.id=a.booking_id JOIN slots s ON s.id=b.slot_id JOIN listings l ON l.id=s.listing_id WHERE sub.file_key=? AND (sub.student_id=? OR l.owner_id=?)`,key,u.id,u.id);
   if(!allowed)fail(404,'Файл не найден');const f=await env.BUCKET?.get(key);if(!f)fail(404,'Файл не найден');return new Response(f!.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(allowed.file_name||'homework')}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
  }
  if(path[0]==='messages'){
   const peer=method==='GET'?url.searchParams.get('peer'):(await req.clone().json() as any).recipientId;
   const person=await one('SELECT id,name,role FROM users WHERE id=?',str(peer));if(!person||person.id===u.id)fail(404,'Собеседник не найден');
   const related=await relation(u.id,person.id)||await one('SELECT id FROM messages WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?) LIMIT 1',u.id,person.id,person.id,u.id);
   if(!related&&!(u.role==='student'&&await one('SELECT id FROM listings WHERE owner_id=? AND active=1',person.id)))fail(403,'Переписка доступна участникам обучения');
   if(method==='GET'){
    await run('UPDATE messages SET read_at=? WHERE sender_id=? AND recipient_id=? AND read_at IS NULL',now(),person.id,u.id);
    return response({person,messages:await all('SELECT * FROM (SELECT * FROM messages WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?) ORDER BY created_at DESC LIMIT 200) ORDER BY created_at',u.id,person.id,person.id,u.id)});
   }
   if(method==='POST'){await rateLimit(req,'message',80);const b=await req.json() as any;await run('INSERT INTO messages(id,sender_id,recipient_id,body,created_at) VALUES(?,?,?,?,?)',uid(),u.id,person.id,str(b.body,1,4000),now());return response({ok:true},201);}
  }
  if(path[0]==='reviews'&&method==='POST'){
   const b=await req.json() as any;
   const completed=await one(`SELECT b.id FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE s.listing_id=? AND b.student_id=? AND b.status='completed' LIMIT 1`,str(b.listingId),u.id);if(!completed)fail(403,'Отзыв можно оставить после завершённого занятия');
   if(await one('SELECT id FROM reviews WHERE listing_id=? AND student_id=?',b.listingId,u.id))fail(409,'Вы уже оставили отзыв');
   await run('INSERT INTO reviews(id,listing_id,student_id,rating,body,created_at) VALUES(?,?,?,?,?,?)',uid(),b.listingId,u.id,num(b.rating,1,5),str(b.body,10,2000),now());return response({ok:true},201);
  }
  if(path[0]==='admin'){
   if(u.role!=='admin')fail(403,'Доступ только для администратора');
   if(method==='GET')return response({users:await all('SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC LIMIT 500'),listings:await all('SELECT l.*,u.name FROM listings l JOIN users u ON u.id=l.owner_id ORDER BY l.created_at DESC LIMIT 500')});
   if(method==='PATCH'){const b=await req.json() as any;await run('UPDATE listings SET active=? WHERE id=?',num(b.active,0,1),str(b.listingId));return response({ok:true});}
  }
  fail(404,'Не найдено');
 }catch(e){return errorResponse(e)}
}
async function completeRequest(req:Request){
 const result=await handler(req);
 // Finish unread bodies before sending early denials. This also keeps the
 // connection reusable on Workers, including its local Wrangler proxy.
 if(req.body&&!req.bodyUsed){
  const reader=req.body.getReader();
  try{while(!(await reader.read()).done){/* discard without buffering uploads */}}catch{}finally{reader.releaseLock()}
 }
 return result;
}
export const GET=completeRequest, POST=completeRequest, PATCH=completeRequest, DELETE=completeRequest;
