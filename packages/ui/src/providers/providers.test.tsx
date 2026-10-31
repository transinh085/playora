import { describe, expect, test } from 'bun:test';
import { Button } from '@playora/ui/components/button';
import { renderToString } from 'react-dom/server';
import { gameThemeConfig } from '../theme/game-theme';
import { PlayProvider, StudioProvider } from './index';

describe('StudioProvider & PlayProvider', () => {
  test('renders StudioProvider in light and dark modes', () => {
    const lightHtml = renderToString(
      <StudioProvider mode="light">
        <Button>Create</Button>
      </StudioProvider>,
    );
    const darkHtml = renderToString(
      <StudioProvider mode="dark">
        <Button>Create</Button>
      </StudioProvider>,
    );
    expect(lightHtml).toContain('Create');
    expect(darkHtml).toContain('Create');
  });

  test('renders PlayProvider with game theme or skin + brand', () => {
    const htmlWithSkin = renderToString(
      <PlayProvider skin="tet" brand={{ primary: '#ffd400' }}>
        <Button>Play</Button>
      </PlayProvider>,
    );
    const htmlWithTheme = renderToString(
      <PlayProvider theme={gameThemeConfig({ skin: 'yep' })}>
        <Button>Join</Button>
      </PlayProvider>,
    );
    expect(htmlWithSkin).toContain('Play');
    expect(htmlWithTheme).toContain('Join');
  });
});
