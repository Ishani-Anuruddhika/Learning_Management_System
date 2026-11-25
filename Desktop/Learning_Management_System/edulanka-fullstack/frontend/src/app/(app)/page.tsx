'use client';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/Icon';
import { CourseCard, Empty, Heading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLms } from '@/context/LmsContext';
import { streams } from '@/lib/streams';

export default function Dashboard() {
  const { user } = useAuth();
  const lms = useLms();
  const router = useRouter();
  const mine = lms.courses.filter(c => lms.enrolled.includes(c.id));
  const mins = lms.courses.flatMap(c => c.lessons).filter(l => lms.done.includes(l.id)).reduce((s, l) => s + l.mins, 0);
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  const browse = (s: string) => { lms.setStream(s); router.push('/courses'); };
  const stats: [IconName, string, string, string][] = [
    ['book', String(lms.courses.length), 'Courses available', 'purple'],
    ['graduation', String(mine.length), 'Enrolled courses', 'blue'],
    ['paper', String(lms.done.length), 'Lessons completed', 'green'],
    ['clock', `${(mins / 60).toFixed(1)} hrs`, 'Study time', 'orange'],
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR LEARNING DASHBOARD</span>
          <h1>{greet}, {user?.fullName.split(' ')[0]} <span>—</span></h1>
          <p>Every study session takes you one step closer. What will you learn today?</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => browse('All streams')}>Explore courses <Icon name="arrow" size={17} /></button>
            {mine[0] && <button className="text-button" onClick={() => router.push(`/courses/${mine[0].id}`)}><Icon name="play" size={18} /> Resume learning</button>}
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="book-stack"><span>AL</span><b>2026</b></div>
          <div className="float-card card-a"><Icon name="note" /><span>Study notes</span></div>
          <div className="float-card card-b"><strong>{lms.done.length}</strong><span>Lessons done</span></div>
          <div className="spark s1">✦</div><div className="spark s2">+</div>
        </div>
      </section>

      <section className="stats-row">
        {stats.map(([icon, value, label, color]) => (
          <div key={label}><span className={`stat-icon ${color}`}><Icon name={icon} /></span><p><strong>{value}</strong><small>{label}</small></p></div>
        ))}
      </section>

      <section className="section-block">
        <Heading eyebrow="CONTINUE LEARNING" title="My courses" />
        <div className="resource-grid">
          {mine.map(c => <CourseCard key={c.id} c={c} />)}
          {!mine.length && <Empty title="No courses yet" text="Enroll in a course below to start tracking your progress." />}
        </div>
      </section>

      <section className="section-block">
        <Heading eyebrow="FIND YOUR PATH" title="Explore by stream" />
        <div className="stream-grid">
          {streams.map(s => (
            <button key={s.name} className="stream-card" style={{ '--accent': s.color, '--soft': s.soft } as CSSProperties} onClick={() => browse(s.name)}>
              <span className="stream-icon">{s.icon}</span><strong>{s.name}</strong><small>{s.subjects}</small>
              <i><Icon name="arrow" size={15} /></i>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
