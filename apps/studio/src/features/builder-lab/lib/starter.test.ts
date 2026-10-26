/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { CreateCampaignBody } from '@playora/contracts';
import { buildScreens, defaultPrizes, defaultRules, skinBrand, TEMPLATES } from './starter';

describe('starter catalogue', () => {
  test('every template × skin starter document satisfies CreateCampaignBody contract', () => {
    for (const template of TEMPLATES) {
      for (const skin of template.skins) {
        const body = {
          name: `${template.key} ${skin.key}`,
          templateKey: template.key,
          skinKey: skin.key,
          brand: skinBrand(skin.key),
          screens: buildScreens(template.key, skin.key),
          prizes: defaultPrizes(),
          rules: defaultRules(new Date('2026-10-26T00:00:00.000Z')),
        };
        const parsed = CreateCampaignBody.safeParse(body);
        expect(parsed.success).toBe(true);
      }
    }
  });
});
