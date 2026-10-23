import { Button } from '@playora/ui/components/button';
import { Logo } from '@playora/ui/components/logo';

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-8 p-8">
      <Logo className="text-xl" />
      <h1 className="font-display text-5xl leading-tight font-bold tracking-tight text-balance sm:text-6xl">
        Cả hội trường cùng chơi.
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Dựng game tương tác cho YEP, hội nghị và activation trong 30 phút. Hàng nghìn người chơi
        cùng lúc trên màn hình LED, giải thưởng minh bạch, báo cáo ngay sau sự kiện.
      </p>
      <div>
        <Button asChild className="h-12 px-6 text-base">
          <a href="mailto:hello@playora.vn">Đặt lịch demo</a>
        </Button>
      </div>
    </main>
  );
}
