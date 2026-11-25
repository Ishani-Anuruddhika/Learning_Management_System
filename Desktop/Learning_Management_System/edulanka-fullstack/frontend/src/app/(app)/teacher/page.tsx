'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { Empty, Heading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLms } from '@/context/LmsContext';
import { api, body } from '@/lib/api';
import { streams } from '@/lib/streams';
import type { Course } from '@/lib/types';

export default function TeacherStudio() {
  const { user } = useAuth();
  const lms = useLms();
  const router = useRouter();
  const [mine, setMine] = useState<Course[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nc, setNc] = useState({ title: '', stream: 'Technology', level: 'Grade 12' });
  const [nl, setNl] = useState({ title: '', mins: '10', type: 'video' });

  const load = useCallback(async () => setMine(await api<Course[]>('/courses/manage/mine')), []);
  useEffect(() => {
    if (!user) return;
    if (user.role === 'student') { router.replace('/'); return; }
    load().catch(e => setError((e as Error).message));
  }, [user, load, router]);

  const course = mine.find(c => c.id === sel);
  const sync = async () => { await load(); await lms.reload(); };
  const run = async (fn: () => Promise<unknown>) => {
    setError(''); setBusy(true);
    try { await fn(); await sync(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const createCourse = (e: FormEvent) => { e.preventDefault(); run(async () => {
    const color = streams.find(s => s.name === nc.stream)?.color ?? '#7157e8';
    const c = await api<Course>('/courses', { method: 'POST', ...body({ ...nc, color }) });
    setNc({ ...nc, title: '' }); setSel(c.id);
  }); };
  const addLesson = (e: FormEvent) => { e.preventDefault(); if (!course) return; run(async () => {
    await api(`/courses/${course.id}/lessons`, { method: 'POST', ...body({ ...nl, mins: Number(nl.mins) }) });
    setNl({ ...nl, title: '' });
  }); };
  const upload = (lessonId: string, file?: File) => { if (!file) return; run(async () => {
    const fd = new FormData(); fd.append('file', file);
    await api(`/lessons/${lessonId}/material`, { method: 'POST', body: fd });
  }); };
  const delLesson = (id: string) => confirm('Delete this lesson and its file?') && run(() => api(`/lessons/${id}`, { method: 'DELETE' }));
  const delCourse = (id: string) => confirm('Delete this whole course?') && run(async () => { await api(`/courses/${id}`, { method: 'DELETE' }); setSel(null); });

  return (
    <section className="resource-section">
      <Heading eyebrow="TEACHER STUDIO" title="Manage courses" />
      {error && <div className="form-error">{error}</div>}
      <div className="studio-grid">
        <div>
          <form className="panel" onSubmit={createCourse}>
            <h3>New course</h3>
            <label className="field"><span>Title</span><input required minLength={3} value={nc.title} onChange={e => setNc({ ...nc, title: e.target.value })} /></label>
            <div className="form-row">
              <label className="field"><span>Stream</span><select value={nc.stream} onChange={e => setNc({ ...nc, stream: e.target.value })}>{streams.map(s => <option key={s.name}>{s.name}</option>)}</select></label>
              <label className="field"><span>Level</span><select value={nc.level} onChange={e => setNc({ ...nc, level: e.target.value })}><option>Grade 12</option><option>Grade 13</option></select></label>
            </div>
            <button className="btn block" disabled={busy}><Icon name="plus" size={16} /> Create course</button>
          </form>
          <div className="panel">
            <h3>My courses</h3>
            <div className="pick-list">
              {mine.map(c => (
                <button key={c.id} className={`lesson prog ${sel === c.id ? 'selected' : ''}`} onClick={() => setSel(c.id)}>
                  <span className="lesson-icon" style={{ color: c.color }}><Icon name="book" size={18} /></span>
                  <div><strong>{c.title}</strong><small>{c.lessons.length} lessons</small></div>
                </button>
              ))}
              {!mine.length && <p className="page-note">No courses yet. Create your first one above.</p>}
            </div>
          </div>
        </div>

        <div>
          {!course ? <Empty title="Select a course" text="Pick a course to add lessons and upload files." /> : (
            <>
              <div className="panel">
                <h3>{course.title}</h3>
                <p className="page-note">{course.stream} · {course.level}</p>
                <button className="btn danger small" onClick={() => delCourse(course.id)} disabled={busy}><Icon name="trash" size={14} /> Delete course</button>
              </div>
              <form className="panel" onSubmit={addLesson}>
                <h3>Add lesson</h3>
                <div className="form-row">
                  <label className="field"><span>Title</span><input required minLength={2} value={nl.title} onChange={e => setNl({ ...nl, title: e.target.value })} /></label>
                  <label className="field"><span>Minutes</span><input type="number" min={1} max={600} value={nl.mins} onChange={e => setNl({ ...nl, mins: e.target.value })} /></label>
                  <label className="field"><span>Type</span><select value={nl.type} onChange={e => setNl({ ...nl, type: e.target.value })}><option>video</option><option>notes</option><option>quiz</option></select></label>
                </div>
                <button className="btn" disabled={busy}><Icon name="plus" size={16} /> Add lesson</button>
              </form>
              <div className="panel">
                <h3>Lessons</h3>
                <div className="lessons" style={{ marginTop: 0 }}>
                  {course.lessons.map((l, i) => (
                    <div className="lesson studio-lesson" key={l.id}>
                      <div><strong>{i + 1}. {l.title}</strong><small>{l.type} · {l.mins} min · {l.hasFile ? l.fileName : 'no file'}</small></div>
                      <div className="actions">
                        <label className="file-label"><Icon name="upload" size={14} /> {l.hasFile ? 'Replace' : 'Upload'}
                          <input type="file" disabled={busy} onChange={e => { upload(l.id, e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                        <button className="btn danger small" onClick={() => delLesson(l.id)} disabled={busy} aria-label="Delete lesson"><Icon name="trash" size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {!course.lessons.length && <p className="page-note">No lessons yet.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
