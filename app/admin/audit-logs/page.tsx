'use client';
import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, Search } from 'lucide-react';
import PaginationBar, { type PaginationState } from '@/components/PaginationBar';
import { useToast } from '@/components/ToastProvider';

type AuditLog = { _id: string; actorEmail?: string; action: string; entity: string; entityId?: string; ipAddress?: string; createdAt: string; after?: unknown; before?: unknown };
const emptyPagination: PaginationState = { page: 1, limit: 10, total: 0, totalPages: 1 };

export default function AuditLogsPage(){
 const [items,setItems]=useState<AuditLog[]>([]);
 const [loading,setLoading]=useState(false);
 const [pagination,setPagination]=useState<PaginationState>(emptyPagination);
 const [filters,setFilters]=useState({action:'',entity:'',actorEmail:'',from:'',to:''});
 const toast=useToast();
 const load=useCallback(async(page=pagination.page, limit=pagination.limit)=>{
  setLoading(true);
  try{
    const p=new URLSearchParams({page:String(page),limit:String(limit)});
    Object.entries(filters).forEach(([k,v])=>{if(v)p.set(k,v)});
    const res=await fetch(`/api/audit-logs?${p}`);
    const data=await res.json();
    if(!res.ok) throw new Error(data.error || 'Failed to load audit logs');
    setItems(data.logs||[]);
    setPagination(data.pagination || {page,limit,total:data.logs?.length||0,totalPages:1});
  }catch(error){
    setItems([]);
    toast.error(error instanceof Error ? error.message : 'Unable to load audit logs.');
  }finally{setLoading(false)}
 },[filters,pagination.limit,pagination.page,toast]);
 useEffect(()=>{void load()},[]); // eslint-disable-line react-hooks/exhaustive-deps
 return <div><div className="mb-6"><h1 className="m-0 flex items-center gap-2 text-2xl font-black text-slate-900"><History size={26}/>Audit Logs</h1><p className="mt-1 text-sm text-slate-500">Track user activity, changes, attendance scans, notification and device actions.</p></div><div className="card mb-4 grid grid-cols-1 gap-3 p-4 md:grid-cols-6"><input className="input" value={filters.action} onChange={(e)=>setFilters({...filters,action:e.target.value})} placeholder="Action"/><input className="input" value={filters.entity} onChange={(e)=>setFilters({...filters,entity:e.target.value})} placeholder="Entity"/><input className="input" value={filters.actorEmail} onChange={(e)=>setFilters({...filters,actorEmail:e.target.value})} placeholder="Actor email"/><input className="input" type="date" value={filters.from} onChange={(e)=>setFilters({...filters,from:e.target.value})}/><input className="input" type="date" value={filters.to} onChange={(e)=>setFilters({...filters,to:e.target.value})}/><button onClick={()=>load(1,pagination.limit)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"><Search size={16}/>Search</button></div><div className="card overflow-hidden"><div className="border-b bg-slate-50 px-5 py-4 font-black">System Audit Trail</div>{loading?<div className="p-10"><Loader2 className="animate-spin"/></div>:items.length===0?<div className="p-10 text-center text-slate-500">No audit log found.</div>:<div className="overflow-x-auto"><table><thead><tr><th>Date</th><th>Actor</th><th>Action</th><th>Entity</th><th>IP</th><th>Data</th></tr></thead><tbody>{items.map(i=><tr key={i._id}><td>{new Date(i.createdAt).toLocaleString()}</td><td>{i.actorEmail || 'System'}</td><td><span className="badge badge-info">{i.action}</span></td><td>{i.entity}<div className="text-xs text-slate-500">{i.entityId}</div></td><td>{i.ipAddress || '—'}</td><td><details><summary className="cursor-pointer font-bold text-blue-700">View</summary><pre className="mt-2 max-w-md overflow-auto rounded-lg bg-slate-100 p-3 text-xs">{JSON.stringify({before:i.before,after:i.after},null,2)}</pre></details></td></tr>)}</tbody></table></div>}{pagination.total>0&&<PaginationBar pagination={pagination} onPageChange={(p)=>load(p,pagination.limit)} onLimitChange={(l)=>load(1,l)} label="audit logs"/>}</div></div>
}
