import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-full p-4 sm:p-6 lg:p-10">
      <Suspense>
        <LoginForm googleEnabled={googleEnabled} />
      </Suspense>
    </main>
  );
}
