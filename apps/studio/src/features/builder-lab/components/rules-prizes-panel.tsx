'use client';

import { Alert, Card } from '@playora/ui/components';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { Caption } from '@/components/caption';
import type { Campaign, CampaignPrize, CampaignRules } from '../api';
import { prizeTotals, ruleIssues } from '../lib/rules-summary';
import { ComplianceStep } from './rules/compliance-step';
import { ModeStep } from './rules/mode-step';
import { PrizeListStep } from './rules/prize-list-step';
import { RulesSentencesStep } from './rules/rules-sentences-step';
import { SimulatorCard } from './rules/simulator-card';

/**
 * "Rules & prizes" mode (docs/product/specs/builder.md §4.2): how prizes are given → prize list → rules as sentences →
 * terms & compliance → simulation. The server engine decides every outcome; nothing here picks or targets a winner.
 */
export function RulesPrizesPanel({
  campaign,
  organizerName,
  onChange,
  focusStep,
}: {
  campaign: Campaign;
  organizerName?: string;
  onChange: (patch: Partial<Pick<Campaign, 'prizes' | 'rules' | 'compliance'>>) => void;
  focusStep?: { step: 1 | 2 | 3 | 4; nonce: number } | null;
}) {
  const t = useTranslations('builderLab.rules');
  const { rules, prizes } = campaign;
  const totals = useMemo(() => prizeTotals(prizes), [prizes]);
  const issues = useMemo(() => ruleIssues(rules, prizes), [rules, prizes]);

  useEffect(() => {
    if (!focusStep) return;
    const el = document.querySelector<HTMLElement>(`[data-testid="rules-step-${focusStep.step}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusStep]);

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
    <div className="flex w-full flex-col gap-4">
      <div>
        <h2 className="font-semibold text-lg leading-tight tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
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

      <StepCard step={4} title={t('steps.compliance')} hint={t('steps.complianceHint')}>
        <ComplianceStep
          campaign={campaign}
          organizerName={organizerName}
          onChange={(compliancePatch) =>
            onChange({ compliance: { ...campaign.compliance, ...compliancePatch } })
          }
        />
      </StepCard>

      {issues.length > 0 && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('issues.title')}</Alert.Title>
            <Alert.Description>
              <ul className="m-0 mt-1 flex list-disc flex-col gap-0.5 pl-5 text-xs">
                {issues.map((issue) => (
                  <li key={issue.key}>{t(`issues.${issue.key}`, issue.values)}</li>
                ))}
              </ul>
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Card className="p-0" data-testid="simulator-card">
        <Card.Header className="flex flex-row items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-white/10">
          <Card.Title className="m-0 text-base font-semibold">{t('sim.title')}</Card.Title>
          <Caption>{t('sim.extra')}</Caption>
        </Card.Header>
        <Card.Content className="p-5">
          <SimulatorCard
            campaign={campaign}
            blocked={issues.length > 0}
            onRulesChange={setRules}
            onPrizesChange={setPrizes}
          />
        </Card.Content>
      </Card>
    </div>
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
    <Card className="p-0" data-testid={`rules-step-${step}`}>
      <Card.Header className="border-b border-neutral-200 px-5 py-4 dark:border-white/10">
        <div className="flex flex-col gap-0.5">
          <Caption>{t('steps.label', { step })}</Caption>
          <Card.Title className="m-0 text-base font-semibold">{title}</Card.Title>
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3 p-5">
        <Card.Description className="m-0 text-neutral-500 text-xs dark:text-neutral-400">
          {hint}
        </Card.Description>
        {children}
      </Card.Content>
    </Card>
  );
}
