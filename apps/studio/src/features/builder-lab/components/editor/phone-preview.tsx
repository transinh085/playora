'use client';

import { Flex, Segmented, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { SCREEN_KEYS, type ScreenKey } from '@/features/canvas-editor/lib/model';
import { Mechanism } from '../../mechanisms/mechanism';
import { getTemplate } from '../../mock/templates';
import type { Campaign } from '../../mock/types';
import { FitScreen } from './fit-screen';
import { toCanvasPrizes } from './to-canvas-prizes';

/** The idle mechanism for a campaign, drawn inside its game stage. */
export function CampaignStage({ campaign }: { campaign: Campaign }) {
  return (
    <Mechanism
      mechanism={getTemplate(campaign.templateKey).mechanism}
      brand={campaign.brand}
      prizes={campaign.prizes}
    />
  );
}

/** Live phone preview of one screen, with a screen switcher (quick edit's right column). */
export function PhonePreview({
  campaign,
  screen,
  onScreenChange,
}: {
  campaign: Campaign;
  screen: ScreenKey;
  onScreenChange: (screen: ScreenKey) => void;
}) {
  const t = useTranslations('builderLab.editor.screens');
  const { token } = theme.useToken();
  const doc = campaign.screens[screen];

  return (
    <Flex vertical align="center" gap={16} className="w-full">
      <div className="max-w-full overflow-x-auto">
        <Segmented
          value={screen}
          onChange={(value) => onScreenChange(value as ScreenKey)}
          options={SCREEN_KEYS.map((key) => ({ value: key, label: t(key) }))}
        />
      </div>
      {/* A 9:18 phone; taller screens scroll inside it like they will on a real phone. */}
      <div
        className="shrink-0 overflow-hidden"
        style={{
          width: 'min(340px, 100%)',
          aspectRatio: '9 / 18',
          borderRadius: 28,
          border: `6px solid ${token.colorText}`,
          boxShadow: token.boxShadowSecondary,
          background: token.colorBgContainer,
        }}
        data-testid="quick-edit-preview"
      >
        <FitScreen
          key={screen}
          screen={doc}
          brand={campaign.brand}
          prizes={toCanvasPrizes(campaign)}
          scroll
          animate={0}
          stage={<CampaignStage campaign={campaign} />}
        />
      </div>
    </Flex>
  );
}
