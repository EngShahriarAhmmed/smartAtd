'use client';
import SimpleResourcePage from '@/components/SimpleResourcePage';
export default function Page(){return <SimpleResourcePage title="Subjects" description="Manage subject master records and subject codes." endpoint="/api/admin/subjects" formTitle="Add Subject" fields={[{name:'name',label:'Subject Name',required:true},{name:'code',label:'Subject Code',required:true}]} columns={[{key:'name',label:'Subject'},{key:'code',label:'Code'},{key:'active',label:'Status'}]} />}
