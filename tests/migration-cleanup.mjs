import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

// Reproduce the previously shipped initializer against the original schema.
// This runs entirely in memory and never connects to a deployed database.
const migration=readFileSync(new URL('../drizzle/0003_remove_starter_offers.sql',import.meta.url),'utf8');
const time='2026-10-16T10:00:00.000Z';
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
function database(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 for(const name of ['0000_quick_nightshade','0001_cloudy_captain_stacy','0002_huge_blur'])db.exec(readFileSync(new URL('../drizzle/'+name+'.sql',import.meta.url),'utf8'));
 return db;
}
function person(db,id,name,role='center',managedBy=null,bio=''){
 db.prepare('INSERT INTO users(id,email,name,role,city,bio,managed_by,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,id+'@ustoz.test',name,role,'Алмалык',bio,managedBy,time);
}
function seed(db,owner,reuse=false){
 person(db,owner,reuse?'АФ МИСИС':'Владелец');
 db.prepare('INSERT INTO workspace_templates(key,owner_id,created_at) VALUES(?,?,?)').run('af-misis-v1:'+owner,owner,time);
 const center=reuse?owner:owner+'-center';
 if(!reuse)person(db,center,'АФ МИСИС','center',owner,'Алмалыкский филиал НИТУ МИСИС. Заполните информацию о курсах и условиях обучения.');
 const subjects=['Английский язык','Программирование','Математика'];
 const names=['Репетитор английского языка','Репетитор программирования','Репетитор математики'];
 const teachers=names.map((name,i)=>{const id=owner+'-teacher-'+i;person(db,id,name,'tutor',owner,'Заполните имя преподавателя, опыт и подход к обучению.');return id});
 const courses=[
  ['Программирование: Python с нуля','Программирование','Основы Python, алгоритмы, работа с данными и практические проекты. Уточните программу, расписание и условия обучения перед публикацией.'],
  ['Английский язык','Английский язык','Разговорная практика, грамматика, чтение и аудирование. Уточните уровни подготовки, программу курса и условия обучения перед публикацией.'],
  ['Математика','Математика','Алгебра, геометрия и решение задач. Заполните программу, возрастную группу и формат занятий перед публикацией курса.'],
  ['Физика','Физика','Механика, электричество и практические задачи. Заполните программу, уровень подготовки и условия обучения перед публикацией курса.']
 ];
 const offers=courses.map(([title,subject,body],i)=>({id:owner+'-course-'+i,owner:center,kind:'course',title,subject,body,duration:90}));
 teachers.forEach((id,i)=>offers.push({id:owner+'-offer-'+i,owner:id,kind:'tutor',title:'Индивидуальные занятия: '+['английский язык','программирование','математика'][i],subject:subjects[i],body:'Опишите опыт, методику и цели занятий. Добавьте имя преподавателя, фотографию и стоимость перед публикацией анкеты.',duration:60}));
 for(const o of offers)db.prepare("INSERT INTO listings(id,owner_id,kind,title,subject,language,city,format,price,duration,description,level,experience,active,created_at) VALUES(?,?,?,?,?,'Русский','Алмалык','Очно',0,?,?,'Все уровни',0,0,?)").run(o.id,o.owner,o.kind,o.title,o.subject,o.duration,o.body,time);
 return {center,teachers,offers};
}
{
 const db=database();db.exec(migration);
 check(db.prepare('SELECT COUNT(*) n FROM users').get().n===0&&db.prepare('SELECT COUNT(*) n FROM listings').get().n===0,'Fresh installations stay empty after every migration');db.close();
}
{
 const db=database();seed(db,'root');seed(db,'reused-root',true);
 db.prepare('INSERT INTO favorites(user_id,listing_id) VALUES(?,?)').run('root','root-course-0');
 db.exec(migration);
 check(db.prepare('SELECT COUNT(*) n FROM listings').get().n===0,'All seven untouched starter offers are removed for every initialized owner');
 check(db.prepare('SELECT COUNT(*) n FROM users').get().n===2,'Empty generated center and tutor workspaces are removed');
 check(db.prepare('SELECT id FROM users WHERE id=?').get('root')&&db.prepare('SELECT id FROM users WHERE id=?').get('reused-root'),'Actual owner accounts survive cleanup, including a reused MISIS center');
 check(db.prepare('SELECT COUNT(*) n FROM favorites').get().n===0,'Deleted drafts leave no dangling favorites');
 check(!db.prepare("SELECT name FROM sqlite_master WHERE name='workspace_templates'").get(),'The retired initialization marker table is removed');db.close();
}
{
 const db=database();const old=seed(db,'owner');
 db.prepare('UPDATE users SET name=? WHERE id=?').run('Настоящий преподаватель',old.teachers[0]);
 db.prepare('UPDATE listings SET title=?,price=?,active=1 WHERE id=?').run('Мой опубликованный курс',150000,'owner-course-0');
 db.prepare('UPDATE listings SET description=? WHERE id=?').run('Самостоятельно отредактированный черновик','owner-offer-1');
 person(db,'independent','Независимый центр');
 db.prepare('INSERT INTO listings(id,owner_id,kind,title,subject,language,city,format,price,duration,description,level,experience,active,photo_key,created_at) SELECT ?,?,kind,title,subject,language,city,format,price,duration,description,level,experience,active,photo_key,created_at FROM listings WHERE id=?').run('independent-offer','independent','owner-course-1');
 db.prepare('INSERT INTO slots(id,listing_id,starts_at,ends_at,capacity) VALUES(?,?,?,?,1)').run('slot','owner-course-3',time,time);
 db.prepare('INSERT INTO bookings(id,slot_id,student_id,created_at) VALUES(?,?,?,?)').run('booking','slot','independent',time);
 db.prepare('INSERT INTO assignments(id,booking_id,title,body,due_at,created_at) VALUES(?,?,?,?,?,?)').run('task','booking','Задание','Условие',time,time);
 db.prepare('INSERT INTO messages(id,sender_id,recipient_id,body,created_at) VALUES(?,?,?,?,?)').run('message','owner',old.teachers[2],'Сохранить переписку',time);
 db.exec(migration);
 const ids=db.prepare('SELECT id FROM listings').all().map(r=>r.id).sort();
 check(JSON.stringify(ids)===JSON.stringify(['independent-offer','owner-course-0','owner-course-3','owner-offer-1'].sort()),'Manual offers, edited drafts, published courses and offers with slots survive cleanup');
 check(!!db.prepare('SELECT id FROM users WHERE id=?').get(old.teachers[0]),'Renamed teacher profiles are preserved');
 check(!!db.prepare('SELECT id FROM users WHERE id=?').get(old.teachers[2])&&db.prepare('SELECT COUNT(*) n FROM messages').get().n===1,'Tutor workspaces with conversations are preserved');
 check(db.prepare('SELECT COUNT(*) n FROM bookings').get().n===1&&db.prepare('SELECT COUNT(*) n FROM assignments').get().n===1,'Existing bookings and homework remain intact');
 check(db.prepare('PRAGMA foreign_key_check').all().length===0,'Cleanup leaves all database references valid');db.close();
}
console.log(`${checks} migration checks passed in memory.`);
