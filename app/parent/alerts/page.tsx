'use client';
import { useEffect, useState } from 'react';
import { Loader2, MessageSquareWarning } from 'lucide-react';
export default function ParentAlertsPage(){
 const [data,setData]=useState<any>(null);
 useEffect(()=>{fetch('/api/parent/children').then(r=>r.json()).then(setData)},[]);
 const alerts = (data?.children||[]).flatMap((item:any)=>item.alerts.map((text:string)=>({ text, student: item.student.name, key: `${item.student._id}-${text}` })));
 return <div><div className="mb-6"><h1 className="m-0 flex items-center gap-2 text-2xl font-black text-slate-900"><MessageSquareWarning size={26}/>Absence Alerts</h1><p className="mt-1 text-sm text-slate-500">Absence and low-attendance alerts for your child.</p></div>{!data?<div className="flex min-h-[300px] items-center justify-center"><Loader2 className="animate-spin" size={44}/></div>:alerts.length?<div className="space-y-3">{alerts.map((a:any)=><div key={a.key} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{a.student}: {a.text}</div>)}</div>:<div className="card p-10 text-center text-slate-500">No alerts found.</div>}</div>
}
