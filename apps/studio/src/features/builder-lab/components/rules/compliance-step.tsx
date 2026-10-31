'use client';

import { generateTerms } from '@playora/core/compliance';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { TextareaBase } from '@playora/ui/components/base/textarea/textarea';
import { FileText, RotateCcw, ShoppingBag, Sparkles } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { IconTile } from '@/components/icon-tile';
import type { Campaign, CampaignCompliance } from '../../api';

/**
 * Step 4: Promotion type & editable terms (CMP-03, CMP-04, docs/business/compliance.md §4).
 * Determines purchase link notification requirements and allows overriding generated legal terms.
 */
export function ComplianceStep({
  campaign,
  organizerName,
  onChange,
}: {
  campaign: Campaign;
  organizerName?: string;
  onChange: (patch: Partial<CampaignCompliance>) => void;
}) {
  const t = useTranslations('builderLab.rules.compliance');
  const compliance = campaign.compliance;

  const generatedTerms = useMemo(() => {
    return generateTerms({
      campaignName: campaign.name,
      organizerName: organizerName || campaign.name,
      rules: campaign.rules,
      prizes: campaign.prizes,
      timezone: 'Asia/Ho_Chi_Minh',
      redeemGraceDays: 7,
    });
  }, [campaign.name, organizerName, campaign.rules, campaign.prizes]);

  const isCustom = compliance.termsText !== null;

  return (
    <div className="flex flex-col gap-5">
      {/* Question: Khách có phải mua hàng mới được chơi không? */}
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">{t('question')}</span>
        <div role="radiogroup" aria-label={t('question')} className="grid gap-3 sm:grid-cols-2">
          {/* purchase_linked */}
          {/* biome-ignore lint/a11y/useSemanticElements: radio container card */}
          <div
            role="radio"
            aria-checked={compliance.promotionType === 'purchase_linked'}
            tabIndex={0}
            onClick={() => onChange({ promotionType: 'purchase_linked' })}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChange({ promotionType: 'purchase_linked' });
              }
            }}
            className={`cursor-pointer rounded-lg border p-3.5 transition-all shadow-xs ${
              compliance.promotionType === 'purchase_linked'
                ? 'border-neutral-900 bg-neutral-50/60 ring-1 ring-neutral-900/10 dark:border-white dark:bg-white/5 dark:ring-white/20'
                : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-white/10 dark:bg-[#0A0A0A] dark:hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <IconTile
                tone={compliance.promotionType === 'purchase_linked' ? 'primary' : 'info'}
                size={32}
              >
                <ShoppingBag className="size-4" />
              </IconTile>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  {t('purchaseLinked')}
                </span>
                <span className="text-neutral-500 text-[11px] leading-relaxed dark:text-neutral-400">
                  {t('purchaseLinkedHint')}
                </span>
              </div>
            </div>
          </div>

          {/* not_linked */}
          {/* biome-ignore lint/a11y/useSemanticElements: radio container card */}
          <div
            role="radio"
            aria-checked={compliance.promotionType === 'not_linked'}
            tabIndex={0}
            onClick={() => onChange({ promotionType: 'not_linked' })}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChange({ promotionType: 'not_linked' });
              }
            }}
            className={`cursor-pointer rounded-lg border p-3.5 transition-all shadow-xs ${
              compliance.promotionType === 'not_linked'
                ? 'border-neutral-900 bg-neutral-50/60 ring-1 ring-neutral-900/10 dark:border-white dark:bg-white/5 dark:ring-white/20'
                : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-white/10 dark:bg-[#0A0A0A] dark:hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <IconTile
                tone={compliance.promotionType === 'not_linked' ? 'success' : 'info'}
                size={32}
              >
                <Sparkles className="size-4" />
              </IconTile>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  {t('notLinked')}
                </span>
                <span className="text-neutral-500 text-[11px] leading-relaxed dark:text-neutral-400">
                  {t('notLinkedHint')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms: preview / edit */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{t('termsTitle')}</span>
            {isCustom ? (
              <Chip variant="caption" color="yellow">
                {t('customBadge')}
              </Chip>
            ) : (
              <Chip variant="caption" color="neutral">
                {t('generatedBadge')}
              </Chip>
            )}
          </div>
          {isCustom ? (
            <Button
              type="button"
              variant="ghost"
              size="small"
              className="h-8 rounded-md text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onChange({ termsText: null })}
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              {t('resetTerms')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="h-8 rounded-md text-xs"
              onClick={() => onChange({ termsText: generatedTerms })}
            >
              <FileText className="mr-1.5 size-3.5" />
              {t('editTerms')}
            </Button>
          )}
        </div>

        <span className="text-neutral-500 text-xs dark:text-neutral-400">{t('termsHint')}</span>

        {isCustom ? (
          <TextareaBase
            rows={10}
            value={compliance.termsText ?? ''}
            onChange={(e) => onChange({ termsText: e.target.value })}
            placeholder={t('termsPlaceholder')}
            className="font-mono text-xs"
          />
        ) : (
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50/50 p-3.5 text-xs leading-relaxed text-neutral-800 dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-200">
            {generatedTerms}
          </div>
        )}
      </div>
    </div>
  );
}
