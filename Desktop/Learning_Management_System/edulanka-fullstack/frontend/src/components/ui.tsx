'use client';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { useLms } from '@/context/LmsContext';
import type { Course } from '@/lib/types';

export const totalMins = (c: Course) => c.lessons.reduce((s, l) => s + l.mins, 0);

export function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="section-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div></div>;
}

export function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><Icon name="search" size={28} /><h3>{title}</h3><p>{text}</p></div>;
}

export function CourseCard({ c }: { c: Course }) {
  const lms = useLms();
  const router = useRouter();
  const enrolled = lms.enrolled.includes(c.id);
  return (
    <article className="resource-card">
      <div className="resource-top" style={{ '--resource': c.color } as CSSProperties}>
        <span className="pdf-badge">{c.level.toUpperCase()}</span>
        <div className="paper-preview"><Icon name="book" size={34} /><i /><i /><i /></div>
      </div>
      <div className="resource-body">
        <div className="tags"><span>{c.stream}</span><b>{c.lessons.length} lessons</b></div>
        <h3>{c.title}</h3>
        <p>{c.teacher}</p>
        {enrolled
          ? <div className="bar"><i style={{ width: `${lms.progress(c)}%` }} /></div>
          : <div className="resource-meta"><span>{totalMins(c)} min total</span><span>•</span><span>Free</span></div>}
        <button className="download-button" onClick={() => router.push(`/courses/${c.id}`)}>
          {enrolled ? 'Continue learning' : 'View course'} <Icon name="arrow" size={16} />
        </button>
      </div>
    </article>
  );
}
