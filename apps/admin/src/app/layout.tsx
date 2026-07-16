import type { ReactNode } from 'react';

export const metadata = {
  title: 'OTC Consignment — Admin',
  description: 'ระบบฝากขาย OTC (Admin Panel)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>{children}</body>
    </html>
  );
}
