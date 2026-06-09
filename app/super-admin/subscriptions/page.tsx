'use client';
import SimpleResourcePage from '@/components/SimpleResourcePage';

export default function SubscriptionsPage() {
  return (
    <SimpleResourcePage
      title="Subscriptions"
      description="Manage subscription plans, billing status, limits and renewals."
      endpoint="/api/super-admin/subscriptions"
      formTitle="Add Subscription Plan"
      fields={[
        { name: 'name', label: 'Plan Name', required: true },
        { name: 'price', label: 'Price', required: true, placeholder: '৳0 / Custom / ৳5,000' },
        { name: 'studentLimit', label: 'Student Limit', placeholder: '500' },
        { name: 'features', label: 'Features', type: 'textarea', placeholder: 'QR attendance, reports, SMS integration' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Suspended', value: 'suspended' }] },
      ]}
      columns={[
        { key: 'name', label: 'Plan' },
        { key: 'price', label: 'Price' },
        { key: 'studentLimit', label: 'Student Limit' },
        { key: 'features', label: 'Features' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
