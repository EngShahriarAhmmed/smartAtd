'use client';
import SimpleResourcePage from '@/components/SimpleResourcePage';

export default function Page() {
  return (
    <SimpleResourcePage
      title="Teachers"
      description="Manage teacher master list, designation and contact information."
      endpoint="/api/admin/teachers"
      formTitle="Add Teacher"
      fields={[
        { name: 'employeeId', label: 'Employee ID', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'designation', label: 'Designation' },
        { name: 'department', label: 'Department' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'active', label: 'Status', type: 'select', required: true, options: [{ label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }] },
      ]}
      columns={[
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'name', label: 'Name' },
        { key: 'designation', label: 'Designation' },
        { key: 'department', label: 'Department' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'active', label: 'Status' },
      ]}
    />
  );
}
