import { describe, expect, it } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { PhoneMockup } from './phone-mockup';

describe('PhoneMockup', () => {
  it('renders realistic iPhone 16 Pro hardware chrome, Dynamic Island, status bar, and home indicator', () => {
    const html = renderToString(
      <PhoneMockup data-testid="quick-edit-preview">
        <div>Game Canvas Content</div>
      </PhoneMockup>,
    );

    expect(html).toContain('data-testid="quick-edit-preview"');
    expect(html).toContain('Game Canvas Content');
    expect(html).toContain('9:41');
    expect(html).toContain('data-testid="phone-dynamic-island"');
    expect(html).toContain('data-testid="phone-home-indicator"');
  });

  it('supports size and titanium finish variants', () => {
    for (const size of ['xs', 'sm', 'md', 'lg'] as const) {
      const html = renderToString(<PhoneMockup size={size}>Screen</PhoneMockup>);
      expect(html).toContain('Screen');
    }

    for (const finish of ['titanium-dark', 'titanium-natural', 'titanium-silver'] as const) {
      const html = renderToString(<PhoneMockup finish={finish}>Screen</PhoneMockup>);
      expect(html).toContain('Screen');
    }
  });

  it('supports toggling overlays and responsive frame collapsing', () => {
    const html = renderToString(
      <PhoneMockup
        showStatusBar={false}
        showDynamicIsland={false}
        showHomeIndicator={false}
        responsiveFrame
      >
        Mobile Rehearsal
      </PhoneMockup>,
    );

    expect(html).toContain('Mobile Rehearsal');
    expect(html).not.toContain('9:41');
    expect(html).not.toContain('data-testid="phone-dynamic-island"');
    expect(html).not.toContain('data-testid="phone-home-indicator"');
    expect(html).toContain('max-[479px]:!rounded-none');
  });
});
