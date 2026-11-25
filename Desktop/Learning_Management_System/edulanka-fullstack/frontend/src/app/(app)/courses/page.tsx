'use client';
import { CourseCard, Empty, Heading } from '@/components/ui';
import { useLms } from '@/context/LmsContext';
import { streams } from '@/lib/streams';

export default function Catalog() {
  const { courses, stream, setStream, query } = useLms();
  const list = courses.filter(c =>
    (stream === 'All streams' || c.stream === stream) &&
    `${c.title} ${c.teacher} ${c.stream}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="resource-section">
      <Heading eyebrow="COURSE CATALOG" title="All courses" />
      <div className="filter-tabs">
        {['All streams', ...streams.map(s => s.name)].map(n => (
          <button key={n} className={stream === n ? 'active' : ''} onClick={() => setStream(n)}>{n}</button>
        ))}
      </div>
      <div className="resource-grid">
        {list.map(c => <CourseCard key={c.id} c={c} />)}
        {!list.length && <Empty title="No courses found" text="Try another stream or search term." />}
      </div>
    </section>
  );
}
