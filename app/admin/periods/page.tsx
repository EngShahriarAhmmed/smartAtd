'use client';
import SimpleResourcePage from '@/components/SimpleResourcePage';
export default function Page(){return <SimpleResourcePage title="Periods" description="Manage daily class periods and times." endpoint="/api/admin/periods" formTitle="Add Period" fields={[{name:'periodName',label:'Period Name',required:true},{name:'startTime',label:'Start Time',type:'time',required:true},{name:'endTime',label:'End Time',type:'time',required:true}]} columns={[{key:'periodName',label:'Period'},{key:'startTime',label:'Start'},{key:'endTime',label:'End'},{key:'active',label:'Status'}]} />}
