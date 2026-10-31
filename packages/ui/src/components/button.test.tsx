import { describe, expect, it } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { Button, type ButtonVariant, buttonSurface, buttonVariants } from './button';

describe('Button (Wensity Primitive)', () => {
  it('renders default button with correct data attributes and surface role', () => {
    const html = renderToString(<Button>Click me</Button>);

    expect(html).toContain('Click me');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('data-wensity-primitive=""');
    expect(html).toContain('data-surface="fill"');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('type="button"');
    expect(html).toContain('wensity-button');
    expect(html).toContain('rounded-xl');
  });

  it('assigns correct surface role to each variant', () => {
    const variants: ButtonVariant[] = [
      'default',
      'secondary',
      'outline',
      'ghost',
      'white',
      'destructive',
      'link',
    ];

    for (const variant of variants) {
      const html = renderToString(<Button variant={variant}>{variant}</Button>);

      if (variant === 'link') {
        expect(html).not.toContain('data-surface');
      } else {
        expect(html).toContain(`data-surface="${buttonSurface[variant]}"`);
      }
      expect(html).toContain(`data-variant="${variant}"`);
    }
  });

  it('renders loading state with spinner and accessibility attributes', () => {
    const html = renderToString(<Button loading>Save</Button>);

    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-loading=""');
    expect(html).toContain('animate-spin');
    expect(html).toContain('Save');
  });

  it('renders icon button loading state with spinner only', () => {
    const html = renderToString(
      <Button size="icon" loading aria-label="Settings">
        <span data-testid="icon">⚙</span>
      </Button>,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('animate-spin');
    expect(html).not.toContain('data-testid="icon"');
  });

  it('renders left and right icons with motion classes and group container', () => {
    const html = renderToString(
      <Button
        leftIcon={<span data-testid="left-icon">✉</span>}
        leftIconMotion="mail"
        rightIcon={<span data-testid="right-icon">→</span>}
        rightIconMotion="arrow"
      >
        Send Mail
      </Button>,
    );

    expect(html).toContain('group');
    expect(html).toContain('data-testid="left-icon"');
    expect(html).toContain('data-testid="right-icon"');
    expect(html).toContain('btn-icon-motion--mail');
    expect(html).toContain('btn-icon-motion--arrow');
  });

  it('supports asChild to render custom elements', () => {
    const html = renderToString(
      <Button asChild variant="outline">
        <a href="/target">Nav link</a>
      </Button>,
    );

    expect(html).toContain('<a');
    expect(html).toContain('href="/target"');
    expect(html).toContain('data-surface="control"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('wensity-button');
    expect(html).toContain('Nav link');
  });

  it('generates variant class names with buttonVariants helper', () => {
    const classes = buttonVariants({ variant: 'destructive', size: 'lg' });
    expect(classes).toContain('wensity-button');
    expect(classes).toContain('rounded-xl');
    expect(classes).toContain('h-10');
  });
});
