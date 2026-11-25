'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/Icon';
import { Empty, totalMins } from '@/components/ui';
import { useLms } from '@/context/LmsContext';
import { api } from '@/lib/api';

const lessonIcon: Record<string, IconName> = { video: 'play', notes: 'note', quiz: 'paper' };

export default function CourseView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const lms = useLms();
  const [error, setError] = useState('');
  const c = lms.courses.find(x => x.id === id);

  if (lms.loading) return <p className="page-note">Loading…</p>;
  if (!c) return <Empty title="Course not found" text="It may have been removed." />;

  const enrolled = lms.enrolled.includes(c.id);
  const pct = lms.progress(c);
  const run = (fn: () => Promise<unknown>) => { setError(''); fn().catch(e => setError((e as Error).message)); };

  const openMaterial = (lessonId: string) => run(async () => {
    const r = await api<{ url: string }>(`/lessons/${lessonId}/material`);
    window.open(r.url, '_blank', 'noopener');
  });

  return (
    <>
      <button className="back" onClick={() => router.push('/courses')}><Icon name="arrow" size={16} /> Back to courses</button>
      <section className="detail-head">
        <div>
          <span className="eyebrow">{c.stream.toUpperCase()} · {c.level.toUpperCase()}</span>
          <h1>{c.title}</h1>
          <p>{c.teacher} · {c.lessons.length} lessons · {totalMins(c)} min</p>
          {enrolled && <div className="bar light"><i style={{ width: `${pct}%` }} /></div>}
        </div>
        {enrolled ? <strong className="pct">{pct}%</strong> : <button className="primary" onClick={() => run(() => lms.enroll(c.id))}>Enroll free</button>}
      </section>
      {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}
      <section className="lessons">
        {c.lessons.map((l, i) => {
          const done = lms.done.includes(l.id);
          return (
            <div className={`lesson ${done ? 'done' : ''}`} key={l.id}>
              <span className="lesson-icon" style={{ color: c.color }}><Icon name={lessonIcon[l.type]} size={18} /></span>
              <div><strong>{i + 1}. {l.title}</strong><small>{l.type} · {l.mins} min{l.hasFile ? ` · ${l.fileName}` : ''}</small></div>
              {l.hasFile && enrolled && <button onClick={() => openMaterial(l.id)}>Open file</button>}
              <button disabled={!enrolled} onClick={() => run(() => lms.toggle(l.id))}>
                {done ? '✓ Completed' : enrolled ? 'Mark complete' : 'Enroll to unlock'}
              </button>
            </div>
          );
        })}
      </section>
    </>
  );
}
