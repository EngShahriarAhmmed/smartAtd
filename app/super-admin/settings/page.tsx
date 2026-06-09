'use client';
import SimpleResourcePage from '@/components/SimpleResourcePage';

export default function PlatformSettingsPage() {
  return (
    <SimpleResourcePage
      title="Platform Settings"
      description="Configure SaaS-level security, tenant defaults, notification providers and system limits."
      endpoint="/api/super-admin/settings"
      formTitle="Add Platform Setting"
      fields={[
        { name: 'category', label: 'Category', type: 'select', required: true, options: [{ label: 'Security', value: 'Security' }, { label: 'Notifications', value: 'Notifications' }, { label: 'Tenant Defaults', value: 'Tenant Defaults' }, { label: 'System Limits', value: 'System Limits' }] },
        { name: 'key', label: 'Setting Key', required: true, placeholder: 'jwt.expiry.minutes' },
        { name: 'value', label: 'Setting Value', required: true, placeholder: '15' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Suspended', value: 'suspended' }] },
      ]}
      columns={[
        { key: 'category', label: 'Category' },
        { key: 'key', label: 'Key' },
        { key: 'value', label: 'Value' },
        { key: 'notes', label: 'Notes' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
