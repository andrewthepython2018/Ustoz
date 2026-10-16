'use client';
import {createContext,useContext} from 'react';
import {copy} from './i18n';
import type {Listing} from './catalog';
export type Workspace={lessons:any[];assignments:any[];listings:any[];available:any[];contacts:any[];favorites:string[]};
export const emptyWorkspace:Workspace={lessons:[],assignments:[],listings:[],available:[],contacts:[],favorites:[]};
export async function api(path:string,method='GET',body?:any):Promise<any>{
 const res=await fetch('/api/'+path,{method,credentials:'same-origin',headers:body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
 const data:any=await res.json();if(!res.ok)throw new Error(data.error||'Ошибка запроса');return data;
}
export type AppState={locale:'ru'|'uz';t:typeof copy.ru;user:any;identity:any;sitesAuth:boolean;catalog:Listing[];ws:Workspace;loading:boolean;path:string;navigate:(path:string)=>void;modal:any;setModal:(v:any)=>void;toast:(s:string)=>void;refresh:()=>Promise<void>;act:(fn:()=>Promise<void>)=>Promise<void>;favorite:(id:string)=>void;subject:(s:string)=>string;};
export const AppContext=createContext<AppState>(null!);
export const useApp=()=>useContext(AppContext);
export const localISO=(value:string)=>{const d=new Date(value+'+05:00');return d.toISOString()};
export const fieldValues=(form:HTMLFormElement)=>Object.fromEntries(new FormData(form).entries()) as Record<string,string>;
