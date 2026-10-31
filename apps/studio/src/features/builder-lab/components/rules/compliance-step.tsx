'use client';

import { generateTerms } from '@playora/core/compliance';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent } from '@playora/ui/components/card';
import { Textarea } from '@playora/ui/components/textarea';
import { FileText, RotateCcw, ShoppingBag, Sparkles } from 'lucide-react';
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
          <Card
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
            className={`cursor-pointer rounded-2xl transition-all ${
              compliance.promotionType === 'purchase_linked'
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border hover:border-foreground/30'
            }`}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <IconTile tone={compliance.promotionType === 'purchase_linked' ? 'primary' : 'info'}>
                <ShoppingBag className="size-5" />
              </IconTile>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold text-sm">{t('purchaseLinked')}</span>
                <span className="text-muted-foreground text-xs leading-relaxed">
                  {t('purchaseLinkedHint')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* not_linked */}
          <Card
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
            className={`cursor-pointer rounded-2xl transition-all ${
              compliance.promotionType === 'not_linked'
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border hover:border-foreground/30'
            }`}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <IconTile tone={compliance.promotionType === 'not_linked' ? 'success' : 'info'}>
                <Sparkles className="size-5" />
              </IconTile>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold text-sm">{t('notLinked')}</span>
                <span className="text-muted-foreground text-xs leading-relaxed">
                  {t('notLinkedHint')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Terms: preview / edit */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{t('termsTitle')}</span>
            {isCustom ? (
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
              >
                {t('customBadge')}
              </Badge>
            ) : (
              <Badge variant="secondary">{t('generatedBadge')}</Badge>
            )}
          </div>
          {isCustom ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full"
              onClick={() => onChange({ termsText: null })}
            >
              <RotateCcw className="mr-1.5 size-4" />
              {t('resetTerms')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => onChange({ termsText: generatedTerms })}
            >
              <FileText className="mr-1.5 size-4" />
              {t('editTerms')}
            </Button>
          )}
        </div>

        <span className="text-muted-foreground text-xs">{t('termsHint')}</span>

        {isCustom ? (
          <Textarea
            rows={10}
            value={compliance.termsText ?? ''}
            onChange={(e) => onChange({ termsText: e.target.value })}
            placeholder={t('termsPlaceholder')}
            className="font-mono text-xs"
          />
        ) : (
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
            {generatedTerms}
          </div>
        )}
      </div>
    </div>
  );
}
