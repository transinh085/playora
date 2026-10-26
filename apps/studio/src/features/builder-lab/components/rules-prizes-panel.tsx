'use client';

import { Alert, Card, Flex, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Caption } from '@/components/caption';
import type { Campaign, CampaignPrize, CampaignRules } from '../api';
import { prizeTotals, ruleIssues } from '../lib/rules-summary';
import { ModeStep } from './rules/mode-step';
import { PrizeListStep } from './rules/prize-list-step';
import { RulesSentencesStep } from './rules/rules-sentences-step';
import { SimulatorCard } from './rules/simulator-card';

/**
 * "Rules & prizes" mode (docs/product/specs/builder.md §4.2): how prizes are given → prize list → rules as sentences →
 * simulation. The server engine decides every outcome; nothing here picks or targets a winner.
 */
export function RulesPrizesPanel({
  campaign,
  onChange,
}: {
  campaign: Campaign;
  onChange: (patch: Partial<Pick<Campaign, 'prizes' | 'rules'>>) => void;
}) {
  const t = useTranslations('builderLab.rules');
  const { rules, prizes } = campaign;
  const totals = useMemo(() => prizeTotals(prizes), [prizes]);
  const issues = useMemo(() => ruleIssues(rules, prizes), [rules, prizes]);

  const setRules = (patch: Partial<CampaignRules>) => onChange({ rules: { ...rules, ...patch } });
  const setPrizes = (next: CampaignPrize[]) => onChange({ prizes: next });
  // Per-prize mode needs a probability on every prize; fill missing ones with 0% when entering it.
  const setMode = (patch: Partial<CampaignRules>) => {
    if (patch.mode === 'per_prize_probability' && prizes.some((p) => p.probability === undefined)) {
      onChange({
        rules: { ...rules, ...patch },
        prizes: prizes.map((p) => ({ ...p, probability: p.probability ?? 0 })),
      });
      return;
    }
    setRules(patch);
  };

  return (
    <Flex vertical gap={16} className="w-full">
      <div>
        <Typography.Title level={4} className="!mb-1">
          {t('title')}
        </Typography.Title>
        <Typography.Text type="secondary">{t('subtitle')}</Typography.Text>
      </div>

      <StepCard step={1} title={t('steps.mode')} hint={t('steps.modeHint')}>
        <ModeStep rules={rules} probabilityPercent={totals.probabilityPercent} onChange={setMode} />
      </StepCard>

      <StepCard step={2} title={t('steps.prizes')} hint={t('steps.prizesHint')}>
        <PrizeListStep
          orgId={campaign.organizationId}
          prizes={prizes}
          mode={rules.mode}
          totals={totals}
          onChange={setPrizes}
        />
      </StepCard>

      <StepCard step={3} title={t('steps.rules')} hint={t('steps.rulesHint')}>
        <RulesSentencesStep
          rules={rules}
          prizes={prizes}
          totalValueVnd={totals.valueVnd}
          onChange={setRules}
        />
      </StepCard>

      {issues.length > 0 && (
        <Alert
          type="error"
          showIcon
          title={t('issues.title')}
          description={
            <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
              {issues.map((issue) => (
                <li key={issue.key}>{t(`issues.${issue.key}`, issue.values)}</li>
              ))}
            </ul>
          }
        />
      )}

      <Card title={t('sim.title')} extra={<Caption>{t('sim.extra')}</Caption>}>
        <SimulatorCard campaign={campaign} blocked={issues.length > 0} onRulesChange={setRules} />
      </Card>
    </Flex>
  );
}

function StepCard({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('builderLab.rules');
  return (
    <Card
      title={
        <Flex vertical className="py-3">
          <Caption>{t('steps.label', { step })}</Caption>
          <span>{title}</span>
        </Flex>
      }
    >
      <Flex vertical gap={12}>
        <Typography.Text type="secondary">{hint}</Typography.Text>
        {children}
      </Flex>
    </Card>
  );
}
