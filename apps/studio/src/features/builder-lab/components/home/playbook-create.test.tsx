/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { getMessages } from '@playora/i18n';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { defaultSetup } from '../../lib/playbooks';
import { suggestPlaybook } from '../../lib/suggest';
import { GoalPicker } from './goal-picker';
import { SuggestionCard } from './playbook-setup';

const NOW = new Date('2026-10-27T03:00:00.000Z');

function render(node: React.ReactNode, locale: 'vi' | 'en' = 'vi') {
  return renderToString(
    <NextIntlClientProvider
      locale={locale}
      messages={getMessages(locale)}
      timeZone="Asia/Ho_Chi_Minh"
    >
      {node}
    </NextIntlClientProvider>,
  );
}

describe('goal-first create (docs/product/specs/playbooks.md §2.1)', () => {
  test('three playbook cards with goal, mechanism and metric, plus the template escape hatch', () => {
    const html = render(<GoalPicker onPick={() => {}} onCustom={() => {}} />);
    expect(html).toContain('Bạn muốn gì?');
    for (const title of ['Tết kéo khách', 'Khách quay lại lần 2', 'Lấp ngày vắng']) {
      expect(html).toContain(title);
    }
    expect(html).toContain('Đo bằng');
    expect(html).toContain('Tự chọn mẫu');
    expect(html).not.toContain('builderLab.');
  });

  test('the Tết suggestion reads as the spec sentence, with the rules it brings', () => {
    const setup = defaultSetup('tet_traffic', 'Tết', NOW);
    const html = render(
      <SuggestionCard
        suggestion={suggestPlaybook('tet_traffic', setup)}
        budgetVnd={setup.budgetVnd}
        pending={false}
      />,
    );
    expect(html).toMatch(
      /Với 2\.000\.000 đ, bạn phát được khoảng 410 phần quà, đủ cho 1 trong \d khách trúng trong 20 ngày\./,
    );
    expect(html).toContain('Tóm tắt luật');
    expect(html).toContain('Tạo chương trình');
    expect(html).not.toContain('builderLab.');
  });

  test('slow days in English: open weekdays in the rules, a warning when prizes are too few', () => {
    const setup = {
      ...defaultSetup('slow_days', 'x', NOW),
      budgetVnd: 100_000,
      guestsPerDay: 3_000,
    };
    const html = render(
      <SuggestionCard
        suggestion={suggestPlaybook('slow_days', setup)}
        budgetVnd={setup.budgetVnd}
        pending={false}
      />,
      'en',
    );
    expect(html).toContain('Open only on Tue, Wed, Thu');
    expect(html).toContain('Few prizes for this many guests');
    expect(html).not.toContain('builderLab.');
  });

  test('without a valid setup it asks to fill the form and cannot create', () => {
    const html = render(<SuggestionCard suggestion={null} budgetVnd={0} pending={false} />);
    expect(html).toContain('Điền đủ thông tin');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>).)*Tạo chương trình/);
  });
});
