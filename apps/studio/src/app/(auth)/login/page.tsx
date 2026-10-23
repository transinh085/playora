import { Suspense } from 'react';
import { LoginForm } from './_components/login-form';

export default function LoginPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  return (
    <main className="bg-muted/40 flex min-h-dvh items-center justify-center p-6">
      <Suspense>
        <LoginForm googleEnabled={googleEnabled} />
      </Suspense>
    </main>
  );
}
