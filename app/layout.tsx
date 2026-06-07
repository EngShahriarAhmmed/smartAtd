import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QR Attendance System',
  description: 'Smart QR-based attendance management for schools',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
