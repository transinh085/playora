/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { getMessages } from '@playora/i18n';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { TemplateCard } from './components/template-card';
import { TemplateToolbar } from './components/template-toolbar';
import { type CatalogTemplate, MOCK_TEMPLATES } from './data/mock-templates';

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

describe('Templates Catalog Mock Data', () => {
  test('has rich mock templates covering diverse occasions and mechanics', () => {
    expect(MOCK_TEMPLATES.length).toBeGreaterThanOrEqual(12);

    const mechanics = new Set(MOCK_TEMPLATES.map((t) => t.mechanic));
    expect(mechanics.has('spin-wheel')).toBe(true);
    expect(mechanics.has('scratch-card')).toBe(true);
    expect(mechanics.has('gift-box')).toBe(true);
    expect(mechanics.has('egg-smash')).toBe(true);

    const occasions = new Set(MOCK_TEMPLATES.map((t) => t.occasion));
    expect(occasions.has('tet')).toBe(true);
    expect(occasions.has('opening')).toBe(true);
    expect(occasions.has('everyday')).toBe(true);

    for (const tpl of MOCK_TEMPLATES) {
      expect(tpl.name).toBeTruthy();
      expect(tpl.availableSkins.length).toBeGreaterThanOrEqual(1);
      expect(tpl.screens.cover).toBeTruthy();
      expect(tpl.screens.game).toBeTruthy();
      expect(tpl.screens.resultWin).toBeTruthy();
      expect(tpl.screens.resultLose).toBeTruthy();
      expect(tpl.usageCount).toBeTruthy();
      expect(tpl.completionRate).toBeTruthy();
      expect(tpl.setupTime).toBeTruthy();
    }
  });
});

describe('Templates UI Components', () => {
  test('renders template card with real canvas preview, usage count, and bookmark action', () => {
    const template = MOCK_TEMPLATES[0] as CatalogTemplate;
    const htmlVi = render(
      <TemplateCard
        template={template}
        isSaved={true}
        onPreview={() => {}}
        onUse={() => {}}
        onToggleSave={() => {}}
      />,
      'vi',
    );
    expect(htmlVi).toContain(template.name);
    expect(htmlVi).toContain('lượt dùng');
    expect(htmlVi).toContain('Xem trước');
    expect(htmlVi).toContain('Dùng mẫu');
    expect(htmlVi).toContain('Đã lưu');
    expect(htmlVi).not.toContain('templatesCatalog.');

    const htmlEn = render(
      <TemplateCard
        template={template}
        isSaved={false}
        onPreview={() => {}}
        onUse={() => {}}
        onToggleSave={() => {}}
      />,
      'en',
    );
    expect(htmlEn).toContain('Preview');
    expect(htmlEn).toContain('Use template');
    expect(htmlEn).toContain('Save template');
    expect(htmlEn).toContain('uses');
    expect(htmlEn).not.toContain('templatesCatalog.');
  });

  test('renders template toolbar with filters and saved tab counter without raw translation keys', () => {
    const htmlVi = render(
      <TemplateToolbar
        filters={{
          query: '',
          occasion: 'all',
          mechanic: 'all',
          vertical: 'all',
          goal: 'all',
          sortBy: 'popularity',
          onlySaved: false,
        }}
        savedCount={3}
        onChange={() => {}}
        onReset={() => {}}
        totalCount={MOCK_TEMPLATES.length}
        filteredCount={MOCK_TEMPLATES.length}
      />,
      'vi',
    );
    expect(htmlVi).toContain('Bộ lọc');
    expect(htmlVi).toContain('Tất cả dịp');
    expect(htmlVi).toContain('Đã lưu (3)');
    expect(htmlVi).not.toContain('templatesCatalog.');
  });
});
