import { describe, expect, test } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { Button, Card, Chip, Input, ProgressBar, Skeleton, Tabs } from './index';

describe('HeroUI v3 components', () => {
  test('renders Button, Card, Chip, Input, ProgressBar, Skeleton, Tabs via SSR', () => {
    const html = renderToString(
      <div>
        <Button variant="primary" size="md">
          Save Campaign
        </Button>
        <Chip variant="soft" color="accent" size="sm">
          Active
        </Chip>
        <Card>
          <Card.Header>
            <Card.Title>Campaign Overview</Card.Title>
            <Card.Description>Daily metrics</Card.Description>
          </Card.Header>
          <Card.Content>
            <Input placeholder="Enter campaign name" defaultValue="Summer Spin" />
            <ProgressBar value={75} aria-label="Progress">
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
            <Skeleton className="h-4 w-32" />
          </Card.Content>
        </Card>
        <Tabs defaultSelectedKey="overview">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Sections">
              <Tabs.Tab id="overview">Overview</Tabs.Tab>
              <Tabs.Tab id="prizes">Prizes</Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="overview">Overview content</Tabs.Panel>
          <Tabs.Panel id="prizes">Prizes content</Tabs.Panel>
        </Tabs>
      </div>,
    );

    expect(html).toContain('Save Campaign');
    expect(html).toContain('Active');
    expect(html).toContain('Campaign Overview');
    expect(html).toContain('Summer Spin');
    expect(html).toContain('Overview content');
  });
});
