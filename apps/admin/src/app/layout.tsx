import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from '../lib/providers';

export const metadata = {
  title: 'OTC Consignment — Admin',
  description: 'ระบบฝากขาย OTC (Admin Panel)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
