'use client';

import { Toaster } from 'react-hot-toast';

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 6000,
        style: {
          fontFamily: 'var(--font-kanit), sans-serif',
          fontSize: '16px',
          padding: '16px 24px',
          maxWidth: '500px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          fontWeight: '500',
        },
        success: {
          style: {
            background: '#ecfdf5',
            color: '#047857',
            border: '1px solid #34d399',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#ecfdf5',
          },
        },
        error: {
          style: {
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #f87171',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fef2f2',
          },
        },
      }}
    />
  );
}
