import { describe, expect, it } from 'bun:test';
import { renderToString } from 'react-dom/server';
import {
  Drawer,
  DrawerFileCard,
  DrawerHeader,
  DrawerMetricCard,
  DrawerMetricGrid,
  DrawerNoteCard,
  DrawerPropertyList,
  DrawerPropertyRow,
  DrawerSummary,
  DrawerTabs,
  DrawerTabsContent,
  DrawerTabsList,
  DrawerTabsTrigger,
} from './drawer';

describe('Drawer component (Louis CRM Pattern)', () => {
  it('renders Drawer when open with custom width and resizer', () => {
    const html = renderToString(
      <Drawer open={true} onOpenChange={() => {}} defaultWidth={612}>
        <DrawerHeader breadcrumbs={<span>Breadcrumbs</span>} />
        <div>Drawer Content</div>
      </Drawer>,
    );

    expect(html).toContain('translate-x-0');
    expect(html).toContain('drawer-backdrop');
    expect(html).toContain('drawer-resizer');
    expect(html).toContain('Breadcrumbs');
    expect(html).toContain('Drawer Content');
  });

  it('renders DrawerSummary with badge, title and actions', () => {
    const html = renderToString(
      <DrawerSummary
        avatar={<div className="avatar-badge" />}
        title="Apex Consulting"
        subtitle="Austin, Texas, USA"
        actions={<button type="button">Call</button>}
      />,
    );

    expect(html).toContain('Apex Consulting');
    expect(html).toContain('avatar-badge');
    expect(html).toContain('Austin, Texas, USA');
    expect(html).toContain('Call');
  });

  it('renders DrawerPropertyList and DrawerPropertyRow', () => {
    const html = renderToString(
      <DrawerPropertyList>
        <DrawerPropertyRow label="Email">
          <a href="mailto:contact@apexconsulting.co">contact@apexconsulting.co</a>
        </DrawerPropertyRow>
      </DrawerPropertyList>,
    );

    expect(html).toContain('Email');
    expect(html).toContain('contact@apexconsulting.co');
  });

  it('renders DrawerMetricGrid and DrawerMetricCard with badge and description', () => {
    const html = renderToString(
      <DrawerMetricGrid>
        <DrawerMetricCard
          label="Response Rate"
          value="92%"
          badge="Very Good"
          badgeColor="success"
          description="Response rate indicates percentage."
        />
      </DrawerMetricGrid>,
    );

    expect(html).toContain('Response Rate');
    expect(html).toContain('92%');
    expect(html).toContain('Very Good');
    expect(html).toContain('Response rate indicates percentage.');
  });

  it('renders DrawerNoteCard and DrawerFileCard', () => {
    const noteHtml = renderToString(
      <DrawerNoteCard title="Contract Renewal Terms" date="Jul 22, 2026" author="By Robert Clark">
        Discussed 2-year multi-license extension.
      </DrawerNoteCard>,
    );

    expect(noteHtml).toContain('Contract Renewal Terms');
    expect(noteHtml).toContain('Jul 22, 2026');
    expect(noteHtml).toContain('By Robert Clark');
    expect(noteHtml).toContain('Discussed 2-year multi-license extension.');

    const fileHtml = renderToString(
      <DrawerFileCard name="Master_Service_Agreement_2026.pdf" size="2.4 MB" date="Jul 22, 2026" />,
    );

    expect(fileHtml).toContain('Master_Service_Agreement_2026.pdf');
    expect(fileHtml).toContain('2.4 MB');
  });

  it('renders DrawerTabs with active content', () => {
    const html = renderToString(
      <DrawerTabs defaultValue="details">
        <DrawerTabsList>
          <DrawerTabsTrigger value="details">Details</DrawerTabsTrigger>
          <DrawerTabsTrigger value="notes" count={8}>
            Notes
          </DrawerTabsTrigger>
        </DrawerTabsList>
        <DrawerTabsContent value="details">
          <div>Details Panel</div>
        </DrawerTabsContent>
        <DrawerTabsContent value="notes">
          <div>Notes Panel</div>
        </DrawerTabsContent>
      </DrawerTabs>,
    );

    expect(html).toContain('Details');
    expect(html).toContain('Notes');
    expect(html).toContain('8');
    expect(html).toContain('Details Panel');
  });
});
