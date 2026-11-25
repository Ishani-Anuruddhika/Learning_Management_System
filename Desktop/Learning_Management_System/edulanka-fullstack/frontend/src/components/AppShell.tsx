'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, type IconName } from './Icon';
import { useAuth } from '@/context/AuthContext';
import { useLms } from '@/context/LmsContext';

const initials = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const lms = useLms();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);
  useEffect(() => setMenuOpen(false), [pathname]);

  if (!user) return null;

  const nav: [string, IconName, string][] = [
    ['/', 'home', 'Dashboard'],
    ['/courses', 'book', 'All courses'],
    ['/progress', 'progress', 'My progress'],
  ];
  if (user.role !== 'student') nav.push(['/teacher', 'settings', 'Teacher studio']);

  const active = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p));
  const mine = lms.courses.filter(c => lms.enrolled.includes(c.id)).flatMap(c => c.lessons);
  const overall = mine.length ? Math.round((mine.filter(l => lms.done.includes(l.id)).length / mine.length) * 100) : 0;
  const first = user.fullName.split(' ')[0];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><Icon name="graduation" size={26} /></div>
          <div><strong>Edu<span>Lanka</span></strong><small>Learn. Grow. Achieve.</small></div>
          <button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><Icon name="close" /></button>
        </div>
        <nav className="nav-list">
          <p>LEARNING SPACE</p>
          {nav.map(([path, icon, label]) => (
            <button key={path} className={active(path) ? 'active' : ''} onClick={() => router.push(path)}>
              <Icon name={icon} /><span>{label}</span>{path === '/courses' && <b>{lms.courses.length}</b>}
            </button>
          ))}
        </nav>
        <div className="exam-card">
          <div className="exam-icon"><Icon name="calendar" /></div>
          <small>OVERALL PROGRESS</small>
          <strong>{overall}% complete</strong>
          <div><i style={{ width: `${overall}%` }} /></div>
          <span>Keep going, {first}!</span>
        </div>
        <div className="profile-mini">
          <div className="avatar">{initials(user.fullName)}</div>
          <div><strong>{user.fullName}</strong><small>{user.role === 'student' ? `${user.stream} stream` : user.role}</small></div>
          <button className="logout-btn" onClick={() => { logout(); router.replace('/login'); }} aria-label="Sign out" title="Sign out"><Icon name="logout" size={18} /></button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="mobile-brand">Edu<span>Lanka</span></div>
          <label className="search-box">
            <Icon name="search" size={19} />
            <input value={lms.query} placeholder="Search courses, teachers, streams..."
              onChange={e => { lms.setQuery(e.target.value); if (e.target.value && pathname !== '/courses') router.push('/courses'); }} />
            <kbd>⌘ K</kbd>
          </label>
          <div className="top-actions">
            <button className="language">EN <Icon name="chevron" size={14} /></button>
            <button className="notification" aria-label="Notifications"><Icon name="bell" /><i /></button>
            <div className="top-avatar">{initials(user.fullName)}</div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
    </div>
  );
}
