/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { RouteProgressBar } from './route-progress-bar';

describe('RouteProgressBar', () => {
  test('renders initially hidden without errors', () => {
    // In SSR, initially it returns null when not active
    const html = renderToString(<RouteProgressBar />);
    expect(html).toBe('');
  });
});
