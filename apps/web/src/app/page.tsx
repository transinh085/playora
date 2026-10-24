import { Button } from 'antd';
import { Logo } from '@/components/logo';

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-8 p-8">
      <Logo className="text-xl" />
      <h1 className="font-display text-5xl leading-tight font-bold tracking-tight text-balance sm:text-6xl">
        Cả hội trường cùng chơi.
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Dựng minigame trúng thưởng cho YEP, hội nghị và chiến dịch thương hiệu trong 30 phút. Thay
        skin theo mùa, kiểm soát tỷ lệ và kho giải minh bạch, báo cáo tức thì.
      </p>
      <div>
        <Button
          type="primary"
          size="large"
          href="mailto:hello@playora.vn"
          className="h-12 px-6 text-base font-semibold"
        >
          Đặt lịch demo
        </Button>
      </div>
    </main>
  );
}
