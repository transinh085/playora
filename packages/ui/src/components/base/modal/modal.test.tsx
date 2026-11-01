import { describe, expect, it } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { DrawerHeader } from '../drawer/drawer';
import { ModalHeader } from './modal';

describe('ModalHeader & DrawerHeader', () => {
  it('renders ModalHeader with string description without nesting divs in p', () => {
    const html = renderToString(
      <ModalHeader title="Modal Title" description="Modal description text" />,
    );

    expect(html).toContain('Modal Title');
    expect(html).toContain('Modal description text');
    expect(html).toContain('<div');
    expect(html).not.toMatch(/<p[^>]*>.*Modal description text.*<\/p>/);
  });

  it('renders DrawerHeader with JSX description containing div elements validly', () => {
    const html = renderToString(
      <DrawerHeader
        title="Drawer Title"
        description={
          <div className="flex items-center gap-2">
            <span>Badge</span>
            <span>Subtitle</span>
          </div>
        }
      />,
    );

    expect(html).toContain('Drawer Title');
    expect(html).toContain('Badge');
    expect(html).toContain('Subtitle');
    // Ensure <div> is not inside <p>
    expect(html).not.toMatch(/<p[^>]*>[\s\S]*<div[\s\S]*<\/p>/);
  });
});
