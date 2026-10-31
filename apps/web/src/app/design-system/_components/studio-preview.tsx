'use client';

import { Alert, AlertDescription, AlertTitle } from '@playora/ui/components/alert';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';

export function StudioPreview() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button className="rounded-full gap-2 shadow-xs">
          <Plus className="size-4" />
          Tạo sự kiện
        </Button>
        <Button variant="outline" className="rounded-full">
          Chơi thử
        </Button>
        <Button variant="secondary" className="rounded-full">
          Lưu nháp
        </Button>
        <Button variant="ghost" className="rounded-full">
          Huỷ
        </Button>
        <Button variant="destructive" className="rounded-full">
          Xoá game
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Nháp</Badge>
        <Badge variant="secondary">Đã lên lịch</Badge>
        <Badge variant="destructive" className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2 animate-live-pulse rounded-full bg-current"
          />
          Đang diễn ra
        </Badge>
        <Badge variant="secondary">Đã kết thúc</Badge>
        <Badge variant="default" className="bg-teal-600 hover:bg-teal-600 text-white">
          Đã check-in
        </Badge>
        <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
          Thiếu ảnh nền
        </Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">YEP ABC 2026</CardTitle>
            <span className="text-xs text-muted-foreground">
              Thứ Bảy, 19/12/2026 · 18:30 · Gem Center, Q.1
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ds-event-name">Tên sự kiện</Label>
              <Input id="ds-event-name" defaultValue="YEP ABC 2026" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-slug">Đường dẫn</Label>
              <Input
                id="ds-slug"
                defaultValue="yep-abc"
                className="rounded-xl border-destructive focus-visible:ring-destructive/20"
              />
              <p className="text-xs text-destructive">Đường dẫn này đã có sự kiện khác dùng.</p>
            </div>
          </CardContent>
        </Card>
        <div className="grid content-start gap-3">
          <Alert className="rounded-2xl border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">
              Còn 2 mục trước khi publish
            </AlertTitle>
            <AlertDescription className="text-amber-700/90 dark:text-amber-400/90 text-xs">
              Thêm ảnh nền cho sự kiện và chơi thử ít nhất một lần.
            </AlertDescription>
          </Alert>
          <Alert className="rounded-2xl border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20">
            <CheckCircle2 className="size-4 text-teal-600 dark:text-teal-400" />
            <AlertTitle className="text-teal-800 dark:text-teal-300 font-semibold">
              Đã chơi thử với 600 lượt
            </AlertTitle>
            <AlertDescription className="text-teal-700/90 dark:text-teal-400/90 text-xs">
              Độ trễ trung vị 84 ms, không có lỗi kết nối.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
