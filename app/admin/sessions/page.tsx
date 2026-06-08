'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, RefreshCw } from 'lucide-react';

type Log = { _id:string; teacherEmail?:string; class:string; section:string; subject?:string; period?:string; date:string; startTime:string; endTime?:string; scanCount:number };

export default function SessionsPage(){
  const [date,setDate]=useState(format(new Date(),'yyyy-MM-dd'));
  const [logs,setLogs]=useState<Log[]>([]);
  const [loading,setLoading]=useState(true);
  async function load(){setLoading(true); const res=await fetch(`/api/admin/sessions?date=${date}`); const data=await res.json(); setLogs(data.logs||[]); setLoading(false)}
  useEffect(()=>{load()},[]);
  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="m-0 text-2xl font-black text-slate-900">Class Sessions</h1><p className="mt-1 text-sm text-slate-500">Monitor teacher class logs, periods and QR attendance activity.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"><RefreshCw size={16}/>Refresh</button></div><div className="card mb-4 p-4"><input className="input max-w-[190px]" type="date" value={date} onChange={(e)=>setDate(e.target.value)}/></div><div className="card overflow-hidden"><div className="border-b bg-slate-50 px-5 py-4 font-black">Teacher Class Logs</div>{loading?<div className="flex min-h-[280px] items-center justify-center"><Loader2 className="animate-spin" size={42}/></div>:logs.length===0?<div className="p-10 text-center text-slate-500">No class sessions found.</div>:<table><thead><tr><th>Teacher</th><th>Class</th><th>Subject</th><th>Period</th><th>Scans</th><th>Start</th></tr></thead><tbody>{logs.map((log)=><tr key={log._id}><td>{log.teacherEmail||'—'}</td><td>{log.class}-{log.section}</td><td>{log.subject||'—'}</td><td>{log.period||'—'}</td><td><span className="badge badge-info">{log.scanCount}</span></td><td>{new Date(log.startTime).toLocaleString()}</td></tr>)}</tbody></table>}</div></div>
}
