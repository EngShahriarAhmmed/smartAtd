'use client';
import { useEffect, useState } from 'react';
import { IdCard, Loader2 } from 'lucide-react';
import IdCardView, { type IdCardInstitution, type IdCardStudent } from '@/components/IdCardView';

export default function StudentIdCardPage(){
 const [data,setData]=useState<{student:IdCardStudent;institution:IdCardInstitution|null;qrDataUrl:string}|null>(null); const [error,setError]=useState('');
 useEffect(()=>{fetch('/api/student/id-card').then(async r=>{const d=await r.json(); if(!r.ok) setError(d.error||'Unable to load ID card'); else setData(d)})},[]);
 return <div><div className="mb-6"><h1 className="m-0 flex items-center gap-2 text-2xl font-black text-slate-900"><IdCard size={26}/>My Student ID Card</h1><p className="mt-1 text-sm text-slate-500">Download or print your secure QR attendance ID card.</p></div>{error?<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>:!data?<div className="flex min-h-[400px] items-center justify-center"><Loader2 className="animate-spin" size={44}/></div>:<IdCardView student={data.student} institution={data.institution} qrDataUrl={data.qrDataUrl}/>}</div>
}
