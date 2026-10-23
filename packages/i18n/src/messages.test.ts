import { describe, expect, test } from 'bun:test';
import { ErrorCode } from '@playora/contracts';
import { getMessages, locales } from './index';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('messages', () => {
  test('every locale has exactly the Vietnamese keys', () => {
    const reference = keys(getMessages('vi')).sort();
    for (const locale of locales) expect(keys(getMessages(locale)).sort()).toEqual(reference);
  });

  test('every API error code has a message', () => {
    for (const locale of locales) {
      expect(Object.keys(getMessages(locale).errors).sort()).toEqual(
        Object.values(ErrorCode).sort(),
      );
    }
  });
});
