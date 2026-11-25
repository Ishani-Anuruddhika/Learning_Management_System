import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata: Metadata = { title: 'EduLanka LMS', description: 'Learn. Grow. Achieve.' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
