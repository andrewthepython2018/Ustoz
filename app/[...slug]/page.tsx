import Platform from '../platform';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;if(!['tutors','courses','listing','favorites','app'].includes(slug[0]))notFound();return <Platform initialPath={'/'+slug.join('/')}/>;}
