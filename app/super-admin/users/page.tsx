'use client';
import SimpleResourcePage from '@/components/SimpleResourcePage';

export default function Page() {
  return (
    <SimpleResourcePage
      title="Platform Users"
      description="Manage platform, institution, teacher, student and parent users."
      endpoint="/api/super-admin/users"
      formTitle="Add User"
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone', type: 'tel' },
        {
          name: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          options: [
            { label: 'Super Admin', value: 'super_admin' },
            { label: 'Institution Admin', value: 'institution_admin' },
            { label: 'Admin', value: 'admin' },
            { label: 'Teacher', value: 'teacher' },
            { label: 'Student', value: 'student' },
            { label: 'Parent', value: 'parent' },
          ],
        },
        { name: 'institutionId', label: 'Institution ID' },
        { name: 'password', label: 'Password / Reset Password', type: 'password', placeholder: 'Leave blank when editing to keep existing password' },
        { name: 'active', label: 'Status', type: 'select', required: true, options: [{ label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }] },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'phone', label: 'Phone' },
        { key: 'institutionId', label: 'Institution' },
        { key: 'active', label: 'Status' },
      ]}
    />
  );
}
