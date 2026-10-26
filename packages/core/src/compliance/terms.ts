import type { CampaignPrize, CampaignRulesInput } from '@playora/contracts';

/**
 * Campaign terms ("thể lệ") generated from the configuration (CMP-04,
 * docs/business/compliance.md §4). Vietnamese only: it is the legal text the shop publishes; the
 * shop can replace it with its own. Pure so the Studio preview and the player shell show the
 * same text.
 */

export interface TermsInput {
  campaignName: string;
  /** The shop, i.e. the merchant running the promotion (compliance §2.3). */
  organizerName: string;
  rules: Pick<
    CampaignRulesInput,
    | 'mode'
    | 'startsAt'
    | 'endsAt'
    | 'openingHours'
    | 'openDays'
    | 'playsPerDay'
    | 'maxWinsPerPlayer'
    | 'collectForm'
    | 'requireRedeemBeforeReplay'
  >;
  prizes: ReadonlyArray<Pick<CampaignPrize, 'name' | 'quantity' | 'valueVnd'>>;
  timezone?: string;
  /** Days after the end during which codes can still be redeemed. */
  redeemGraceDays: number;
}

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;

function dateTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

function date(at: Date, timeZone: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(at);
}

const HOW_WINNERS_ARE_DECIDED: Record<TermsInput['rules']['mode'], string> = {
  overall_win_rate:
    'Kết quả mỗi lượt chơi do hệ thống quyết định ngẫu nhiên trên máy chủ tại thời điểm chơi, theo tỷ lệ trúng đã cài đặt và số quà còn lại.',
  per_prize_probability:
    'Kết quả mỗi lượt chơi do hệ thống quyết định ngẫu nhiên trên máy chủ tại thời điểm chơi, theo xác suất đã cài đặt cho từng giải và số quà còn lại.',
  guaranteed:
    'Mỗi lượt chơi hợp lệ nhận một phần quà trong số quà còn lại, chọn ngẫu nhiên trên máy chủ.',
};

export function generateTerms(input: TermsInput): string {
  const tz = input.timezone ?? 'Asia/Ho_Chi_Minh';
  const { rules } = input;
  const days = rules.openDays?.length
    ? [...rules.openDays]
        .sort()
        .map((d) => WEEKDAYS[d])
        .join(', ')
    : null;
  const hours = rules.openingHours
    ? `từ ${rules.openingHours.start} đến ${rules.openingHours.end}`
    : 'cả ngày';
  const redeemBy = new Date(Date.parse(rules.endsAt) + input.redeemGraceDays * 86_400_000);
  const total = input.prizes.reduce((sum, p) => sum + p.quantity * p.valueVnd, 0);

  const sections = [
    `THỂ LỆ CHƯƠNG TRÌNH "${input.campaignName.toUpperCase()}"`,
    `1. Đơn vị tổ chức: ${input.organizerName}.`,
    `2. Thời gian: từ ${dateTime(rules.startsAt, tz)} đến ${dateTime(rules.endsAt, tz)}${
      days ? `, vào các ngày ${days}` : ''
    }, ${hours}.`,
    `3. Đối tượng: khách hàng của ${input.organizerName} tham gia qua đường dẫn hoặc mã QR chính thức của chương trình.`,
    `4. Cách tham gia: mỗi khách được ${rules.playsPerDay} lượt chơi mỗi ngày${
      rules.collectForm ? ', sau khi điền họ tên, số điện thoại và đồng ý điều khoản tham gia' : ''
    }. Mỗi khách nhận tối đa ${rules.maxWinsPerPlayer ?? 1} phần quà trong suốt chương trình.${
      rules.requireRedeemBeforeReplay
        ? ' Khách cần đổi phần quà đã trúng tại quầy trước khi chơi lượt tiếp theo.'
        : ''
    }`,
    `5. Cơ cấu giải thưởng:\n${input.prizes
      .map((p) => `   - ${p.name}: ${p.quantity} phần, trị giá ${vnd(p.valueVnd)}/phần`)
      .join('\n')}\n   Tổng giá trị giải thưởng: ${vnd(total)}.`,
    `6. Cách xác định người trúng: ${HOW_WINNERS_ARE_DECIDED[rules.mode]} Không ai, kể cả đơn vị tổ chức, có thể chọn trước người trúng. Khi quà đã phát hết, các lượt chơi sau không trúng.`,
    `7. Nhận quà: khách đưa mã đổi quà cho nhân viên tại quầy trước ${date(redeemBy, tz)}. Mỗi mã chỉ dùng được một lần, không quy đổi thành tiền mặt.`,
    `8. Dữ liệu cá nhân: thông tin khách cung cấp chỉ dùng để tổ chức chương trình và trao quà${
      rules.collectForm ? ', và để gửi ưu đãi nếu khách đồng ý riêng' : ''
    }. Khách có thể yêu cầu xem, sửa hoặc xoá dữ liệu bằng cách liên hệ đơn vị tổ chức.`,
    `9. Mọi hành vi gian lận (dùng nhiều thiết bị, công cụ tự động…) sẽ bị huỷ kết quả. Trường hợp tranh chấp, quyết định của ${input.organizerName} là quyết định cuối cùng, phù hợp với quy định pháp luật.`,
  ];
  return sections.join('\n\n');
}
