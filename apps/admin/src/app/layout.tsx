import React from 'react';
import localFont from 'next/font/local';
import './globals.css';

const dbHeavent = localFont({
  src: '../../public/fonts/DBHeavent.ttf',
  variable: '--font-dbheavent',
  display: 'swap',
});

export const metadata = {
  title: 'OTC Consignment — Admin',
  description: 'ระบบฝากขาย OTC (Admin Panel)',
};

import ToasterProvider from '../components/ToasterProvider';

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="th" className={dbHeavent.variable}>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 text-slate-800 antialiased min-h-screen" style={{ fontFamily: 'var(--font-dbheavent), sans-serif' }}>
        <ToasterProvider />
        {children}
      </body>

    </html>
  );
}

