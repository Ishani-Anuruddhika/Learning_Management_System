'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';
import { streams } from '@/lib/streams';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const router = useRouter();
  const [v, setV] = useState({ fullName: '', email: '', password: '', stream: 'Technology' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) router.replace('/'); }, [user, router]);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await register(v); router.replace('/'); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand">
          <div className="brand-icon"><Icon name="graduation" size={26} /></div>
          <div><strong>Edu<span>Lanka</span></strong><small>Learn. Grow. Achieve.</small></div>
        </div>
        <h1>Create your account</h1>
        <p>Start learning for free.</p>
        {error && <div className="form-error">{error}</div>}
        <label className="field"><span>Full name</span><input required minLength={2} value={v.fullName} onChange={set('fullName')} autoComplete="name" /></label>
        <label className="field"><span>Email</span><input type="email" required value={v.email} onChange={set('email')} autoComplete="email" /></label>
        <label className="field"><span>Password (min 8 characters)</span><input type="password" required minLength={8} value={v.password} onChange={set('password')} autoComplete="new-password" /></label>
        <label className="field"><span>Your A/L stream</span>
          <select value={v.stream} onChange={set('stream')}>{streams.map(s => <option key={s.name}>{s.name}</option>)}</select>
        </label>
        <button className="btn block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <div className="auth-switch">Already registered? <Link href="/login">Sign in</Link></div>
      </form>
    </div>
  );
}
