import type { ReactNode } from 'react';

export const metadata = {
  title: 'OTC Consignment — Admin',
  description: 'ระบบฝากขาย OTC (Admin Panel)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }} className="bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}

