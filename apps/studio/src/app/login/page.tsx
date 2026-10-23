'use client';

import { Button } from '@playora/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    setBusy(true);
    setError(null);
    const { error } =
      mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(form.get('name')) });
    setBusy(false);
    if (error) setError(error.message ?? 'Đăng nhập thất bại');
    else router.push('/');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-extrabold">
        {mode === 'sign-in' ? 'Đăng nhập Studio' : 'Tạo tài khoản'}
      </h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === 'sign-up' && (
          <input
            name="name"
            required
            placeholder="Họ tên"
            className="h-11 rounded-lg border border-border bg-surface px-3"
          />
        )}
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="h-11 rounded-lg border border-border bg-surface px-3"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Mật khẩu"
          className="h-11 rounded-lg border border-border bg-surface px-3"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy} className="h-11">
          {mode === 'sign-in' ? 'Đăng nhập' : 'Đăng ký'}
        </Button>
      </form>
      <button
        type="button"
        className="text-sm underline opacity-70"
        onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
      >
        {mode === 'sign-in' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>
    </main>
  );
}
