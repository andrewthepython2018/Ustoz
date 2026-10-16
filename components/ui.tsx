'use client';
import {ArrowUpRight,BookOpen,Search,Star,Heart,MapPin,Video,ArrowRight} from 'lucide-react';
import {useApp} from '@/lib/client';
import {Listing,money} from '@/lib/catalog';
export function Brand(){return <span className="brand"><svg width="30" height="34" viewBox="0 0 30 34" fill="none" aria-hidden="true"><path d="M15 0c0 9-4 13-15 17 11 3 15 7 15 17 0-10 4-14 15-17C19 13 15 9 15 0Z" fill="currentColor"/><path d="M15 9v16M7 17h16" stroke="#f8f6ef" strokeWidth="1.2"/></svg>ustoz<span className="brand-dot">.</span></span>}
export function Empty({icon:Icon=BookOpen,title,text,action,label}:{icon?:any;title:string;text?:string;action?:()=>void;label?:string}){return <div className="empty"><div className="empty-icon"><Icon size={30} strokeWidth={1.5}/></div><h3>{title}</h3>{text&&<p>{text}</p>}{action&&<button className="btn primary" onClick={action}>{label}<ArrowRight size={17}/></button>}</div>}
export function Avatar({name,size='normal'}:{name:string;size?:string}){return <span className={'avatar '+size}>{name?.split(' ').slice(0,2).map(s=>s[0]).join('')}</span>}
export function Rating({listing:l}:{listing:Listing}){const {t}=useApp();return <span className="rating">{l.review_count>0?<><Star size={13} fill="currentColor"/>{Number(l.rating).toFixed(1)}<span>({l.review_count})</span></>:<span>{t.noReviews}</span>}</span>}
export function Card({listing:l}:{listing:Listing}){
 const {t,subject,navigate,ws,favorite}=useApp();const saved=ws.favorites.includes(l.id);
 return <article className={'listing-card '+(l.kind==='course'?'course-card':'')}>
  <div className={'card-image '+(l.accent||'sage')}>
   <a href={'/listing/'+l.id} onClick={e=>{e.preventDefault();navigate('/listing/'+l.id)}} aria-label={l.name}>{l.image?<img src={l.image} alt={l.kind==='course'?l.title:l.name} loading="lazy"/>:<div className="listing-placeholder">{l.kind==='course'?<BookOpen size={60} strokeWidth={1}/>:<Avatar name={l.name} size="hero"/>}</div>}</a>
   <span className="image-tag">{l.format==='Онлайн'?<Video size={12}/>:<MapPin size={12}/>} {l.format==='Онлайн'?t.online:l.format==='Очно'?t.offline:t.hybrid}</span>
   <button className={'heart '+(saved?'saved':'')} aria-label={saved?t.unsave:t.save} onClick={()=>favorite(l.id)}><Heart size={18} fill={saved?'currentColor':'none'}/></button>
   {l.demo&&<span className="demo-tag">{t.demo}</span>}
  </div>
  <div className="card-content"><div className="card-eyebrow"><span>{subject(l.subject)}</span><Rating listing={l}/></div>
   <a className="card-name" href={'/listing/'+l.id} onClick={e=>{e.preventDefault();navigate('/listing/'+l.id)}}>{l.kind==='course'?l.title:l.name}<ArrowUpRight size={19}/></a>
   <p className="card-caption">{l.kind==='course'?l.name:l.title}</p>
   <div className="card-meta"><span><MapPin size={13}/>{l.city}</span><span>{l.language}</span><span>{l.experience} {t.years}</span></div>
   <div className="card-bottom"><div><strong>{money(l.price)} <small>{t.sum}</small></strong><span>{l.kind==='course'?t.perMonth:t.perLesson} · {l.duration} {t.min}</span></div><button className="card-arrow" aria-label={t.more+' '+l.name} onClick={()=>navigate('/listing/'+l.id)}><ArrowUpRight size={21}/></button></div>
  </div>
 </article>
}
export function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
export function SectionHead({eyebrow,title,text,action,label}:{eyebrow?:string;title:string;text?:string;action?:()=>void;label?:string}){return <div className="section-head"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{text&&<p>{text}</p>}</div>{action&&<button className="text-link" onClick={action}>{label}<ArrowUpRight size={18}/></button>}</div>}
