import { describe, expect, test } from 'bun:test';
import { Button } from 'antd';
import { renderToString } from 'react-dom/server';
import { gameThemeConfig } from '../theme/game-theme';
import { PlayProvider, StudioProvider } from './index';

describe('StudioProvider & PlayProvider', () => {
  test('renders StudioProvider in light and dark modes', () => {
    const lightHtml = renderToString(
      <StudioProvider mode="light">
        <Button type="primary">Create</Button>
      </StudioProvider>,
    );
    const darkHtml = renderToString(
      <StudioProvider mode="dark">
        <Button type="primary">Create</Button>
      </StudioProvider>,
    );
    expect(lightHtml).toContain('Create');
    expect(darkHtml).toContain('Create');
  });

  test('renders PlayProvider with game theme or skin + brand', () => {
    const htmlWithSkin = renderToString(
      <PlayProvider skin="tet" brand={{ primary: '#ffd400' }}>
        <Button type="primary">Play</Button>
      </PlayProvider>,
    );
    const htmlWithTheme = renderToString(
      <PlayProvider theme={gameThemeConfig({ skin: 'yep' })}>
        <Button type="primary">Join</Button>
      </PlayProvider>,
    );
    expect(htmlWithSkin).toContain('Play');
    expect(htmlWithTheme).toContain('Join');
  });
});
