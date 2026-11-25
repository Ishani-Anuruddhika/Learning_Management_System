'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import type { Course } from '@/lib/types';

type Ctx = {
  courses: Course[]; enrolled: string[]; done: string[]; loading: boolean;
  stream: string; setStream: (s: string) => void; query: string; setQuery: (q: string) => void;
  enroll: (id: string) => Promise<void>;
  toggle: (lessonId: string) => Promise<void>;
  progress: (c: Course) => number;
  reload: () => Promise<void>;
};
const LmsCtx = createContext<Ctx | null>(null);

/** Replaces the original localStorage store: same API surface (enroll / toggle / progress), now backed by the Node API. */
export function LmsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState('All streams');
  const [query, setQuery] = useState('');

  const reload = useCallback(async () => {
    const [c, s] = await Promise.all([
      api<Course[]>('/courses'),
      api<{ enrolled: string[]; done: string[] }>('/me/state'),
    ]);
    setCourses(c); setEnrolled(s.enrolled); setDone(s.done);
  }, []);

  useEffect(() => {
    if (!user) return;
    reload().catch(console.error).finally(() => setLoading(false));
  }, [user, reload]);

  const enroll = async (id: string) => {
    await api(`/courses/${id}/enroll`, { method: 'POST' });
    setEnrolled(p => (p.includes(id) ? p : [...p, id]));
  };
  const toggle = async (lessonId: string) => {
    const r = await api<{ done: boolean }>(`/lessons/${lessonId}/toggle`, { method: 'POST' });
    setDone(p => (r.done ? (p.includes(lessonId) ? p : [...p, lessonId]) : p.filter(x => x !== lessonId)));
  };
  const progress = (c: Course) =>
    c.lessons.length ? Math.round((c.lessons.filter(l => done.includes(l.id)).length / c.lessons.length) * 100) : 0;

  return (
    <LmsCtx.Provider value={{ courses, enrolled, done, loading, stream, setStream, query, setQuery, enroll, toggle, progress, reload }}>
      {children}
    </LmsCtx.Provider>
  );
}

export function useLms() {
  const c = useContext(LmsCtx);
  if (!c) throw new Error('useLms must be used inside <LmsProvider>');
  return c;
}
