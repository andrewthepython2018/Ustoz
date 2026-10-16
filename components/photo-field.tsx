'use client';
import {useEffect,useState} from 'react';
import {Camera,Upload,X} from 'lucide-react';
import {api,useApp} from '@/lib/client';
export async function imageFromForm(form:HTMLFormElement,values:Record<string,string>){
 const file=(form.elements.namedItem('photo') as HTMLInputElement|null)?.files?.[0];
 if(file){if(file.size>5*1024*1024)throw new Error('Фотография должна быть не больше 5 МБ');const body=new FormData();body.append('file',file);return (await api('media','POST',body)).key;}
 return values.photoKey||null;
}
export function PhotoField({photoKey,src,label}:{photoKey?:string|null;src?:string;label?:string}){
 const {t}=useApp(),[key,setKey]=useState(photoKey||''),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(src||'');
 useEffect(()=>{if(!file)return;const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 return <div className="photo-field"><span className="photo-label">{label||t.photo}</span><div className="photo-editor"><div className="photo-preview">{preview?<img src={preview} alt={label||t.photo}/>:<Camera size={30} strokeWidth={1.5}/>}</div><div><label className="btn secondary small photo-upload"><Upload size={15}/>{t.uploadPhoto}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-label={label||t.photo} onChange={e=>setFile(e.target.files?.[0]||null)}/></label><small>JPG, PNG, WebP · {t.maxPhotoSize}</small>{preview&&<button type="button" className="text-link small" onClick={e=>{const input=(e.currentTarget.closest('.photo-editor')?.querySelector('input[type=file]')) as HTMLInputElement|null;if(input)input.value='';setFile(null);setKey('');setPreview('')}}><X size={13}/>{t.removePhoto}</button>}</div></div><input name="photoKey" type="hidden" value={key}/></div>
}
