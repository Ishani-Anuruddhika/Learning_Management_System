'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { Empty, Heading } from '@/components/ui';
import { useLms } from '@/context/LmsContext';

export default function Progress() {
  const lms = useLms();
  const router = useRouter();
  const mine = lms.courses.filter(c => lms.enrolled.includes(c.id));
  return (
    <section className="resource-section">
      <Heading eyebrow="YOUR JOURNEY" title="My progress" />
      <div className="lessons">
        {mine.map(c => {
          const done = c.lessons.filter(l => lms.done.includes(l.id)).length;
          return (
            <button className="lesson prog" key={c.id} onClick={() => router.push(`/courses/${c.id}`)}>
              <span className="lesson-icon" style={{ color: c.color }}><Icon name="progress" size={18} /></span>
              <div><strong>{c.title}</strong><small>{done} of {c.lessons.length} lessons · {lms.progress(c)}%</small>
                <div className="bar"><i style={{ width: `${lms.progress(c)}%` }} /></div></div>
            </button>
          );
        })}
        {!mine.length && <Empty title="Nothing to track yet" text="Enroll in a course to see your progress here." />}
      </div>
    </section>
  );
}
