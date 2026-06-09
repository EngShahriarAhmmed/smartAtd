'use client';
import SimpleResourcePage from '@/components/SimpleResourcePage';

export default function Page() {
  return (
    <SimpleResourcePage
      title="Institutions"
      description="Create and manage school, college, madrasa and tenant institutions."
      endpoint="/api/admin/institutions"
      formTitle="Add Institution"
      fields={[
        { name: 'name', label: 'Institution Name', required: true },
        { name: 'code', label: 'Institution Code', required: true },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'logo', label: 'Logo URL' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Suspended', value: 'suspended' }] },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'code', label: 'Code' },
        { key: 'address', label: 'Address' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
