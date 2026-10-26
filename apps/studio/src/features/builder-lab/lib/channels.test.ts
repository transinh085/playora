import { describe, expect, test } from 'bun:test';
import {
  buildPlayerLink,
  CHANNEL_KEY_REGEX,
  MAX_CHANNEL_LENGTH,
  PRESET_CHANNELS,
  slugifyChannelKey,
} from './channels';

describe('channels helper', () => {
  describe('slugifyChannelKey', () => {
    test('removes Vietnamese diacritics and converts to kebab-case', () => {
      expect(slugifyChannelKey('QR để bàn')).toBe('qr-de-ban');
      expect(slugifyChannelKey('Quầy thu ngân')).toBe('quay-thu-ngan');
      expect(slugifyChannelKey('Bàn số 12')).toBe('ban-so-12');
      expect(slugifyChannelKey('Đặc biệt & Khuyến mãi')).toBe('dac-biet-khuyen-mai');
    });

    test('strips punctuation, emojis, and special characters', () => {
      expect(slugifyChannelKey('Instagram @cafe! 🎉')).toBe('instagram-cafe');
      expect(slugifyChannelKey('table_qr #1')).toBe('table_qr-1');
      expect(slugifyChannelKey('***fanpage***')).toBe('fanpage');
    });

    test('collapses consecutive dashes and trims edges', () => {
      expect(slugifyChannelKey('---hello---world---')).toBe('hello-world');
      expect(slugifyChannelKey('   zalo   oa   ')).toBe('zalo-oa');
    });

    test('enforces MAX_CHANNEL_LENGTH of 64 characters', () => {
      const longInput = 'a'.repeat(100);
      const slug = slugifyChannelKey(longInput);
      expect(slug.length).toBeLessThanOrEqual(MAX_CHANNEL_LENGTH);
      expect(slug.length).toBe(64);
    });

    test('produces keys that strictly match CHANNEL_KEY_REGEX', () => {
      const inputs = [
        'Bàn VIP 1',
        'Tờ rơi tháng 10/2026',
        'Facebook Ads',
        'Zalo Story',
        'Quầy order #2',
        '---test_underscore---',
      ];
      for (const input of inputs) {
        const result = slugifyChannelKey(input);
        expect(CHANNEL_KEY_REGEX.test(result)).toBe(true);
      }
    });

    test('handles empty or blank strings', () => {
      expect(slugifyChannelKey('')).toBe('');
      expect(slugifyChannelKey('   ')).toBe('');
      expect(slugifyChannelKey('!@#$%^&*()')).toBe('');
    });
  });

  describe('buildPlayerLink', () => {
    const BASE_URL = 'http://localhost:3002';
    const SLUG = 'tra-sua-phuc-long';

    test('builds link with channel parameter when key is provided', () => {
      expect(buildPlayerLink(BASE_URL, SLUG, 'table-qr')).toBe(
        'http://localhost:3002/tra-sua-phuc-long?ch=table-qr',
      );
      expect(buildPlayerLink(BASE_URL, SLUG, 'counter')).toBe(
        'http://localhost:3002/tra-sua-phuc-long?ch=counter',
      );
    });

    test('builds link without query parameter when channel key is omitted or empty', () => {
      expect(buildPlayerLink(BASE_URL, SLUG)).toBe('http://localhost:3002/tra-sua-phuc-long');
      expect(buildPlayerLink(BASE_URL, SLUG, '')).toBe('http://localhost:3002/tra-sua-phuc-long');
    });

    test('handles trailing slashes on base URL and leading slashes on slug', () => {
      expect(buildPlayerLink('http://localhost:3002/', '/tra-sua-phuc-long/', 'zalo')).toBe(
        'http://localhost:3002/tra-sua-phuc-long?ch=zalo',
      );
      expect(buildPlayerLink('https://play.playora.vn///', 'tet-2026', 'fanpage')).toBe(
        'https://play.playora.vn/tet-2026?ch=fanpage',
      );
    });

    test('properly encodes special URI characters in channel keys', () => {
      expect(buildPlayerLink(BASE_URL, SLUG, 'ban_1')).toBe(
        'http://localhost:3002/tra-sua-phuc-long?ch=ban_1',
      );
    });
  });

  describe('PRESET_CHANNELS', () => {
    test('contains the 4 required preset channels', () => {
      const keys = PRESET_CHANNELS.map((c) => c.key);
      expect(keys).toEqual(['table-qr', 'counter', 'fanpage', 'zalo']);
    });

    test('all preset keys conform to CHANNEL_KEY_REGEX', () => {
      for (const channel of PRESET_CHANNELS) {
        expect(CHANNEL_KEY_REGEX.test(channel.key)).toBe(true);
      }
    });
  });
});
