'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,Building2,UserRound,Plus,PenLine,Check,Layers3,BookOpen} from 'lucide-react';
import {api,useApp} from '@/lib/client';
import {Avatar,SectionHead} from './ui';
export function Accounts(){
 const {user,t,locale,modal,setModal,refresh,switchAccount,navigate}=useApp();
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState('');
 useEffect(()=>{let live=true;api('accounts').then(d=>{if(live)setData(d)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[user.id,modal]);
 const open=async(id:string)=>{setBusy(id);setError('');try{await switchAccount(id);navigate('/app')}catch(e:any){setError(e.message)}finally{setBusy('')}};
 const initialize=async()=>{setBusy('initialize');setError('');try{await api('accounts/initialize','POST',{});await refresh();setData(await api('accounts'))}catch(e:any){setError(e.message)}finally{setBusy('')}};
 return <><SectionHead eyebrow="USTOZ · WORKSPACES" title={t.accounts} text={t.accountsIntro} action={()=>setModal({type:'account'})} label={t.addAccount}/>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {data&&!data.initialized&&<section className="setup-banner"><div className="setup-mark"><Building2 size={30}/></div><div><span className="eyebrow">АФ МИСИС · Алмалык</span><h2>{t.prepareMisis}</h2><p>{t.prepareMisisText}</p></div><button className="btn primary" disabled={!!busy} onClick={initialize}>{busy==='initialize'?t.loading:t.createAccounts}<ArrowUpRight size={18}/></button></section>}
  {data?.initialized&&<p className="workspace-explanation"><Check size={17}/>{t.accountsReady}</p>}
  <div className="accounts-grid">{data?.accounts.map((a:any)=><article className={'account-card '+(a.id===user.id?'current-account':'')} key={a.id}><div className="account-card-top"><Avatar name={a.name} size="large" src={a.photo_url}/><span className="account-role">{t[a.role as keyof typeof t]}</span>{a.id===user.id&&<span className="current-label"><Check size={12}/>{t.currentAccount}</span>}</div><h3>{a.name}</h3><p>{a.city}</p><div className="account-count"><BookOpen size={15}/>{t.offersCount}: {a.listings_count}<span>{t.publishedCount}: {a.published_count}</span></div><div className="account-card-actions"><button className="btn primary small" disabled={!!busy} onClick={()=>open(a.id)}>{busy===a.id?t.loading:t.openAccount}<ArrowUpRight size={16}/></button><button className="btn secondary small" onClick={()=>setModal({type:'account',item:a})}><PenLine size={15}/>{t.editListing}</button></div></article>)}</div>
  {!data&&!error&&<p className="muted">{t.loading}</p>}
  <div className="accounts-footnote"><Layers3 size={20}/><p>{t.accountAccessNote}</p></div>
 </>
}
