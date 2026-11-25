import type { ReactNode } from 'react';
import { LmsProvider } from '@/context/LmsContext';
import { AppShell } from '@/components/AppShell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <LmsProvider><AppShell>{children}</AppShell></LmsProvider>;
}
