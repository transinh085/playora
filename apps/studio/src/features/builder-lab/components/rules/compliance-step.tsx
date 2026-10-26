'use client';

import { generateTerms } from '@playora/core/compliance';
import { Button, Card, Flex, Input, Tag, Typography, theme } from 'antd';
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
  const { token } = theme.useToken();
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
    <Flex vertical gap={20}>
      {/* Question: Khách có phải mua hàng mới được chơi không? */}
      <Flex vertical gap={8}>
        <Typography.Text strong className="text-sm">
          {t('question')}
        </Typography.Text>
        <div role="radiogroup" aria-label={t('question')} className="grid gap-3 sm:grid-cols-2">
          {/* purchase_linked */}
          <Card
            role="radio"
            aria-checked={compliance.promotionType === 'purchase_linked'}
            hoverable
            tabIndex={0}
            onClick={() => onChange({ promotionType: 'purchase_linked' })}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChange({ promotionType: 'purchase_linked' });
              }
            }}
            className="cursor-pointer transition-all"
            style={{
              borderColor:
                compliance.promotionType === 'purchase_linked'
                  ? token.colorPrimary
                  : token.colorBorderSecondary,
              background:
                compliance.promotionType === 'purchase_linked'
                  ? token.colorPrimaryBg
                  : token.colorBgContainer,
            }}
          >
            <Flex gap={12} align="start">
              <IconTile tone={compliance.promotionType === 'purchase_linked' ? 'primary' : 'info'}>
                <ShoppingBag className="size-5" />
              </IconTile>
              <Flex vertical gap={4} className="min-w-0 flex-1">
                <Typography.Text strong className="text-sm">
                  {t('purchaseLinked')}
                </Typography.Text>
                <Typography.Text type="secondary" className="text-xs leading-relaxed">
                  {t('purchaseLinkedHint')}
                </Typography.Text>
              </Flex>
            </Flex>
          </Card>

          {/* not_linked */}
          <Card
            role="radio"
            aria-checked={compliance.promotionType === 'not_linked'}
            hoverable
            tabIndex={0}
            onClick={() => onChange({ promotionType: 'not_linked' })}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChange({ promotionType: 'not_linked' });
              }
            }}
            className="cursor-pointer transition-all"
            style={{
              borderColor:
                compliance.promotionType === 'not_linked'
                  ? token.colorPrimary
                  : token.colorBorderSecondary,
              background:
                compliance.promotionType === 'not_linked'
                  ? token.colorPrimaryBg
                  : token.colorBgContainer,
            }}
          >
            <Flex gap={12} align="start">
              <IconTile tone={compliance.promotionType === 'not_linked' ? 'success' : 'info'}>
                <Sparkles className="size-5" />
              </IconTile>
              <Flex vertical gap={4} className="min-w-0 flex-1">
                <Typography.Text strong className="text-sm">
                  {t('notLinked')}
                </Typography.Text>
                <Typography.Text type="secondary" className="text-xs leading-relaxed">
                  {t('notLinkedHint')}
                </Typography.Text>
              </Flex>
            </Flex>
          </Card>
        </div>
      </Flex>

      {/* Terms: preview / edit */}
      <Flex vertical gap={8}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={8}>
            <Typography.Text strong className="text-sm">
              {t('termsTitle')}
            </Typography.Text>
            {isCustom ? (
              <Tag color="orange">{t('customBadge')}</Tag>
            ) : (
              <Tag color="blue">{t('generatedBadge')}</Tag>
            )}
          </Flex>
          {isCustom ? (
            <Button
              type="text"
              danger
              icon={<RotateCcw className="size-4" />}
              onClick={() => onChange({ termsText: null })}
            >
              {t('resetTerms')}
            </Button>
          ) : (
            <Button
              icon={<FileText className="size-4" />}
              onClick={() => onChange({ termsText: generatedTerms })}
            >
              {t('editTerms')}
            </Button>
          )}
        </Flex>

        <Typography.Text type="secondary" className="text-xs">
          {t('termsHint')}
        </Typography.Text>

        {isCustom ? (
          <Input.TextArea
            rows={10}
            value={compliance.termsText ?? ''}
            onChange={(e) => onChange({ termsText: e.target.value })}
            placeholder={t('termsPlaceholder')}
            className="font-mono text-xs"
          />
        ) : (
          <div
            className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg p-3 text-xs leading-relaxed"
            style={{
              background: token.colorBgLayout,
              border: `1px solid ${token.colorBorderSecondary}`,
              color: token.colorText,
            }}
          >
            {generatedTerms}
          </div>
        )}
      </Flex>
    </Flex>
  );
}
