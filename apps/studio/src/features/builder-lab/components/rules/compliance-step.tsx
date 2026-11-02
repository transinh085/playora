'use client';

import { generateTerms } from '@playora/core/compliance';
import { Alert, Button, Card, Chip, TextArea } from '@playora/ui/components';
import { FileText, RotateCcw, ShoppingBag, Sparkles } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { IconTile } from '@/components/icon-tile';
import type { Campaign, CampaignCompliance } from '../../api';

export function isCustomTermsStale(
  termsText: string | null,
  campaign: Pick<Campaign, 'prizes' | 'rules'>,
  generatedTerms: string,
): boolean {
  if (!termsText) return false;
  const trimmed = termsText.trim();
  if (!trimmed || trimmed === generatedTerms.trim()) return false;
  for (const prize of campaign.prizes) {
    if (
      prize.quantity > 0 &&
      (!trimmed.includes(prize.name) || !trimmed.includes(String(prize.quantity)))
    ) {
      return true;
    }
  }
  const dateMatches = generatedTerms.match(/\d{2}\/\d{2}\/\d{4}/g) ?? [];
  for (const d of dateMatches) {
    if (!trimmed.includes(d)) return true;
  }
  return false;
}

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
  const isStale = useMemo(
    () => isCustomTermsStale(compliance.termsText, campaign, generatedTerms),
    [compliance.termsText, campaign, generatedTerms],
  );

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
            className={`cursor-pointer p-3.5 transition-all ${
              compliance.promotionType === 'purchase_linked'
                ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                : 'border-border hover:border-border/80'
            }`}
          >
            <Card.Content className="flex flex-row items-start gap-3 p-0">
              <IconTile
                tone={compliance.promotionType === 'purchase_linked' ? 'primary' : 'info'}
                size={32}
              >
                <ShoppingBag className="size-4" />
              </IconTile>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Card.Title className="m-0 font-semibold text-xs text-foreground">
                  {t('purchaseLinked')}
                </Card.Title>
                <Card.Description className="m-0 text-muted text-[11px] leading-relaxed">
                  {t('purchaseLinkedHint')}
                </Card.Description>
              </div>
            </Card.Content>
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
            className={`cursor-pointer p-3.5 transition-all ${
              compliance.promotionType === 'not_linked'
                ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                : 'border-border hover:border-border/80'
            }`}
          >
            <Card.Content className="flex flex-row items-start gap-3 p-0">
              <IconTile
                tone={compliance.promotionType === 'not_linked' ? 'success' : 'info'}
                size={32}
              >
                <Sparkles className="size-4" />
              </IconTile>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Card.Title className="m-0 font-semibold text-xs text-foreground">
                  {t('notLinked')}
                </Card.Title>
                <Card.Description className="m-0 text-muted text-[11px] leading-relaxed">
                  {t('notLinkedHint')}
                </Card.Description>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Terms: preview / edit */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{t('termsTitle')}</span>
            {isCustom ? (
              <Chip variant="soft" color="warning" size="sm">
                {t('customBadge')}
              </Chip>
            ) : (
              <Chip variant="soft" color="default" size="sm">
                {t('generatedBadge')}
              </Chip>
            )}
          </div>
          {isCustom ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
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
              size="sm"
              className="h-8 rounded-md text-xs"
              onClick={() => onChange({ termsText: generatedTerms })}
            >
              <FileText className="mr-1.5 size-3.5" />
              {t('editTerms')}
            </Button>
          )}
        </div>

        <span className="text-muted text-xs">{t('termsHint')}</span>

        {isCustom && isStale && (
          <Alert status="warning" data-testid="stale-terms-warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title className="text-xs font-medium">{t('staleWarning')}</Alert.Title>
              <div className="mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  data-testid="stale-terms-reset"
                  className="h-7 rounded-md text-xs"
                  onPress={() => onChange({ termsText: generatedTerms })}
                >
                  <RotateCcw className="mr-1.5 size-3" />
                  {t('staleResetAction')}
                </Button>
              </div>
            </Alert.Content>
          </Alert>
        )}

        {isCustom ? (
          <TextArea
            rows={10}
            value={compliance.termsText ?? ''}
            onChange={(e) => onChange({ termsText: e.target.value })}
            placeholder={t('termsPlaceholder')}
            fullWidth
            className="font-mono text-xs"
          />
        ) : (
          <Card
            variant="secondary"
            className="max-h-72 overflow-y-auto whitespace-pre-wrap p-3.5 text-xs leading-relaxed text-foreground"
          >
            <Card.Content className="p-0">{generatedTerms}</Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
}
