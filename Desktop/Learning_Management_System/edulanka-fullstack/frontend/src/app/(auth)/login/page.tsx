'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) router.replace('/'); }, [user, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await login(email, password); router.replace('/'); }
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
        <h1>Welcome back</h1>
        <p>Sign in to continue learning.</p>
        {error && <div className="form-error">{error}</div>}
        <label className="field"><span>Email</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        <label className="field"><span>Password</span><input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button className="btn block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="auth-switch">New here? <Link href="/register">Create an account</Link></div>
      </form>
    </div>
  );
}
