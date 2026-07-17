'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin1234');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/dashboard');
  }, [ready, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(username, password);
      router.replace('/dashboard');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>ระบบฝากขาย OTC</h1>
        <p className="sub">Admin Panel — เข้าสู่ระบบ</p>
        <div className="field">
          <label>ชื่อผู้ใช้</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>รหัสผ่าน</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div className="error-text">{err}</div>}
        <button className="btn primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
          {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}
