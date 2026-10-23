'use client';

import { Button } from '@playora/ui';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export function SessionPanel() {
  const { data, isPending } = authClient.useSession();

  if (isPending) return <p className="opacity-60">Đang kiểm tra phiên đăng nhập…</p>;
  if (!data) {
    return (
      <Link href="/login" className="underline">
        Đăng nhập để bắt đầu
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <p>
        Xin chào, <strong>{data.user.name}</strong> ({data.user.email})
      </p>
      <Button variant="secondary" onClick={() => authClient.signOut()}>
        Đăng xuất
      </Button>
    </div>
  );
}
