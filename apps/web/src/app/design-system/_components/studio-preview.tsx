'use client';

import { Alert, Button, Card, Form, Input, Tag } from 'antd';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';

export function StudioPreview() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="primary" icon={<Plus className="size-4" />}>
          Tạo sự kiện
        </Button>
        <Button>Chơi thử</Button>
        <Button variant="filled" color="default">
          Lưu nháp
        </Button>
        <Button type="text">Huỷ</Button>
        <Button danger type="primary">
          Xoá game
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tag>Nháp</Tag>
        <Tag color="processing">Đã lên lịch</Tag>
        <Tag color="error" className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2 animate-live-pulse rounded-full bg-current"
          />
          Đang diễn ra
        </Tag>
        <Tag>Đã kết thúc</Tag>
        <Tag color="success">Đã check-in</Tag>
        <Tag color="warning">Thiếu ảnh nền</Tag>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="YEP ABC 2026"
          extra={
            <span className="text-xs text-muted-foreground">
              Thứ Bảy, 19/12/2026 · 18:30 · Gem Center, Q.1
            </span>
          }
        >
          <Form layout="vertical" component="div">
            <Form.Item label="Tên sự kiện">
              <Input id="ds-event-name" defaultValue="YEP ABC 2026" />
            </Form.Item>
            <Form.Item
              label="Đường dẫn"
              validateStatus="error"
              help="Đường dẫn này đã có sự kiện khác dùng."
              className="mb-0"
            >
              <Input id="ds-slug" defaultValue="yep-abc" status="error" />
            </Form.Item>
          </Form>
        </Card>
        <div className="grid content-start gap-3">
          <Alert
            type="warning"
            showIcon
            icon={<AlertTriangle className="size-4" />}
            title="Còn 2 mục trước khi publish"
            description="Thêm ảnh nền cho sự kiện và chơi thử ít nhất một lần."
          />
          <Alert
            type="success"
            showIcon
            icon={<CheckCircle2 className="size-4" />}
            title="Đã chơi thử với 600 lượt"
            description="Độ trễ trung vị 84 ms, không có lỗi kết nối."
          />
        </div>
      </div>
    </div>
  );
}
