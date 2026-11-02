import { describe, expect, test } from 'bun:test';
import { renderToString } from 'react-dom/server';
import {
  AppLayout,
  Button,
  Card,
  Chip,
  Command,
  Input,
  Navbar,
  ProgressBar,
  Resizable,
  Sidebar,
  Skeleton,
  Tabs,
} from './index';

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

  test('renders HeroUI Pro AppLayout, Sidebar, Navbar, and Resizable via SSR', () => {
    const html = renderToString(
      <AppLayout
        sidebarCollapsible="icon"
        sidebar={
          <Sidebar>
            <Sidebar.Header>
              <span data-sidebar="label">Playora Studio</span>
            </Sidebar.Header>
            <Sidebar.Content>
              <Sidebar.Group>
                <Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
                <Sidebar.Menu aria-label="Navigation" defaultExpandedKeys={['analytics']}>
                  <Sidebar.MenuItem
                    id="dashboard"
                    href="/dashboard"
                    isCurrent
                    textValue="Dashboard"
                  >
                    <Sidebar.MenuLabel>Dashboard</Sidebar.MenuLabel>
                    <Sidebar.MenuChip>
                      <Chip size="sm" variant="soft" color="accent">
                        Live
                      </Chip>
                    </Sidebar.MenuChip>
                  </Sidebar.MenuItem>
                </Sidebar.Menu>
              </Sidebar.Group>
            </Sidebar.Content>
            <Sidebar.Footer>
              <span data-sidebar="footer">v3.2</span>
            </Sidebar.Footer>
          </Sidebar>
        }
        navbar={
          <Navbar maxWidth="full">
            <Navbar.Header>
              <Navbar.Brand>Playora</Navbar.Brand>
              <Navbar.Content>
                <Navbar.Item>Overview</Navbar.Item>
              </Navbar.Content>
            </Navbar.Header>
          </Navbar>
        }
      >
        <Resizable orientation="horizontal">
          <Resizable.Panel id="left" defaultSize={50} minSize={20}>
            Left
          </Resizable.Panel>
          <Resizable.Handle id="handle" />
          <Resizable.Panel id="right" defaultSize={50} minSize={20}>
            Right
          </Resizable.Panel>
        </Resizable>
      </AppLayout>,
    );

    expect(html).toContain('Playora Studio');
    expect(html).toContain('Dashboard');
    expect(html).toContain('Playora');
    expect(html).toContain('Left');
    expect(html).toContain('Right');
  });

  test('renders HeroUI Pro Command via SSR', () => {
    const html = renderToString(
      <Command size="md">
        <Command.Dialog>
          <Command.Header>
            <Command.InputGroup>
              <Command.InputGroup.Prefix>🔍</Command.InputGroup.Prefix>
              <Command.InputGroup.Input placeholder="Type a command or search..." />
              <Command.InputGroup.ClearButton />
            </Command.InputGroup>
          </Command.Header>
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group heading="Suggestions">
              <Command.Item id="calendar" textValue="Calendar">
                Calendar
              </Command.Item>
              <Command.Item id="settings" textValue="Settings">
                Settings
              </Command.Item>
            </Command.Group>
            <Command.Separator />
            <Command.Group heading="Help">
              <Command.Item id="docs" textValue="Docs">
                Docs
              </Command.Item>
            </Command.Group>
          </Command.List>
          <Command.Footer>
            <span>Navigation tips</span>
          </Command.Footer>
        </Command.Dialog>
      </Command>,
    );

    expect(html).toContain('data-slot="command-dialog"');
    expect(html).toContain('data-slot="command-input-group"');
    expect(html).toContain('Type a command or search...');
    expect(html).toContain('data-slot="command-list"');
    expect(html).toContain('Suggestions');
    expect(html).toContain('Calendar');
    expect(html).toContain('Navigation tips');
  });
});
