import { Button } from '@playora/ui';

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-8 p-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand">Playora</p>
      <h1 className="text-5xl font-extrabold leading-tight sm:text-6xl">
        Cả hội trường cùng chơi.
      </h1>
      <p className="max-w-2xl text-lg opacity-80">
        Dựng game tương tác cho YEP, hội nghị và activation trong 30 phút. Hàng nghìn người chơi
        cùng lúc trên màn hình LED, giải thưởng minh bạch, báo cáo ngay sau sự kiện.
      </p>
      <div>
        <a href="mailto:hello@playora.vn">
          <Button className="h-12 px-6 text-base">Đặt lịch demo</Button>
        </a>
      </div>
    </main>
  );
}
