import { describe, expect, it } from 'bun:test';
import { RiAddLine, RiArrowRightLine } from '@remixicon/react';
import { renderToString } from 'react-dom/server';
import { Badge } from '../badges/badge';
import { Chip } from '../badges/chip';
import { Input } from '../input/input';
import { Button, ButtonLink } from './button';

describe('BoardUI Base Primitives', () => {
  it('renders primary Button with BoardUI semantic classes and press motion', () => {
    const html = renderToString(<Button>Click me</Button>);

    expect(html).toContain('Click me');
    expect(html).toContain('type="button"');
    expect(html).toContain('bg-button-primary');
    expect(html).toContain('button-press-motion');
    expect(html).toContain('rounded-2lg');
  });

  it('renders Button variants and sizes', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      const html = renderToString(<Button variant={variant}>{variant}</Button>);
      expect(html).toContain(variant);
    }

    const smallHtml = renderToString(<Button size="small">Small</Button>);
    expect(smallHtml).toContain('h-8');

    const xsHtml = renderToString(<Button size="xs">XS</Button>);
    expect(xsHtml).toContain('h-6');
  });

  it('renders leading and trailing Remix icons', () => {
    const html = renderToString(
      <Button leadingIcon={RiAddLine} trailingIcon={RiArrowRightLine}>
        Add item
      </Button>,
    );

    expect(html).toContain('Add item');
    expect(html).toContain('<svg');
  });

  it('renders ButtonLink anchor counterpart', () => {
    const html = renderToString(
      <ButtonLink href="/campaigns" variant="secondary">
        Campaigns
      </ButtonLink>,
    );

    expect(html).toContain('<a');
    expect(html).toContain('href="/campaigns"');
    expect(html).toContain('Campaigns');
    expect(html).toContain('bg-background-primary-default');
    expect(html).toContain('border-border-button-default');
  });

  it('renders Chip, Badge, and Input with BoardUI semantic tokens', () => {
    const chipHtml = renderToString(<Chip color="cyan">Active</Chip>);
    expect(chipHtml).toContain('bg-status-cyan-background');

    const badgeHtml = renderToString(<Badge color="primary">12</Badge>);
    expect(badgeHtml).toContain('bg-accent-400');

    const inputHtml = renderToString(<Input label="Campaign Name" placeholder="Summer Spin" />);
    expect(inputHtml).toContain('Campaign Name');
    expect(inputHtml).toContain('Summer Spin');
  });
});
