'use client';

import {
  App,
  Button,
  Card,
  Flex,
  Input,
  Modal,
  Segmented,
  Select,
  Tag,
  Typography,
  theme,
} from 'antd';
import { Check, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Caption } from '@/components/caption';
import { useBrandKits } from '@/features/brand-kits/api';
import { brandFromKit } from '../../lib/brand';
import { campaignRoutes } from '../../lib/routes';
import { useCreateCampaign } from '../../mock/hooks';
import { buildScreens, TEMPLATES } from '../../mock/templates';
import type { Occasion, SkinInfo, SkinKey, TemplateKey } from '../../mock/types';
import { FitScreen } from '../editor/fit-screen';

const OCCASIONS: Occasion[] = ['tet', 'opening', 'everyday'];
const MECHANICS: TemplateKey[] = ['spin-wheel', 'scratch-card', 'gift-box'];

interface Choice {
  templateKey: TemplateKey;
  skin: SkinInfo;
}

/** "Create campaign": pick template × skin from live cover previews, name it, start editing. */
export function TemplateGallery({ orgId }: { orgId: string }) {
  const t = useTranslations('builderLab.home');
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const router = useRouter();
  const create = useCreateCampaign();
  const brandKits = useBrandKits(orgId);
  const [occasion, setOccasion] = useState<Occasion | 'all'>('all');
  const [mechanic, setMechanic] = useState<TemplateKey | 'all'>('all');
  const [picked, setPicked] = useState<{ templateKey: TemplateKey; skinKey: SkinKey } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedBrandKitId, setSelectedBrandKitId] = useState<string | undefined>(undefined);

  const choices = useMemo<Choice[]>(
    () => TEMPLATES.flatMap((tpl) => tpl.skins.map((skin) => ({ templateKey: tpl.key, skin }))),
    [],
  );
  const covers = useMemo(
    () =>
      new Map(
        choices.map((c) => [
          `${c.templateKey}:${c.skin.key}`,
          buildScreens(c.templateKey, c.skin.key).cover,
        ]),
      ),
    [choices],
  );

  const visible = choices.filter(
    (c) =>
      (occasion === 'all' || c.skin.occasion === occasion) &&
      (mechanic === 'all' || c.templateKey === mechanic),
  );

  const pick = (c: Choice, openModal = true) => {
    setPicked({ templateKey: c.templateKey, skinKey: c.skin.key });
    setName(
      t('defaultName', {
        template: t(`templates.${c.templateKey}`),
        skin: t(`skins.${c.skin.key}`),
      }),
    );
    if (brandKits.data?.items[0]?.id && !selectedBrandKitId) {
      setSelectedBrandKitId(brandKits.data.items[0].id);
    }
    if (openModal) {
      setModalOpen(true);
    }
  };

  const submit = async () => {
    if (!picked || !name.trim()) return;
    try {
      const chosenKit =
        brandKits.data?.items.find((k) => k.id === selectedBrandKitId) ?? brandKits.data?.items[0];
      const campaign = await create.mutateAsync({
        ...picked,
        orgId,
        name: name.trim(),
        brand: brandFromKit(chosenKit),
      });
      message.success(t('created'));
      router.push(campaignRoutes(orgId).edit(campaign.id));
    } catch {
      message.error(t('createFailed'));
    }
  };

  const activeChoice = picked
    ? choices.find((c) => c.templateKey === picked.templateKey && c.skin.key === picked.skinKey)
    : null;
  const activeCover = picked ? covers.get(`${picked.templateKey}:${picked.skinKey}`) : null;

  return (
    <>
      <Card
        variant="borderless"
        style={{ border: `1px solid ${token.colorBorderSecondary}` }}
        title={
          <Flex align="center" gap={8}>
            <Sparkles className="size-4" />
            {t('create.title')}
          </Flex>
        }
      >
        <Flex vertical gap={20}>
          <Caption>{t('create.hint')}</Caption>

          <Flex gap={16} wrap align="center" justify="space-between" className="border-b pb-4">
            <Flex gap={8} align="center" wrap>
              <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                {t('mechanicsLabel')}:
              </Typography.Text>
              <Segmented<TemplateKey | 'all'>
                value={mechanic}
                onChange={setMechanic}
                options={[
                  { value: 'all', label: t('occasions.all') },
                  ...MECHANICS.map((key) => ({
                    value: key,
                    label: t(`templates.${key}`),
                  })),
                ]}
              />
            </Flex>

            <Flex gap={6} wrap align="center">
              <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                {t('occasionsLabel')}:
              </Typography.Text>
              {(['all', ...OCCASIONS] as const).map((key) => (
                <Tag.CheckableTag
                  key={key}
                  checked={occasion === key}
                  onChange={() => setOccasion(key)}
                  className="!m-0"
                >
                  {key === 'all' ? t('occasions.all') : t(`occasions.${key}`)}
                </Tag.CheckableTag>
              ))}
            </Flex>
          </Flex>

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
          >
            {visible.map((c) => {
              const key = `${c.templateKey}:${c.skin.key}`;
              const active = picked?.templateKey === c.templateKey && picked.skinKey === c.skin.key;
              const cover = covers.get(key);
              return (
                <Card
                  key={key}
                  variant="borderless"
                  onClick={() => pick(c, true)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`${t(`templates.${c.templateKey}`)} · ${t(`skins.${c.skin.key}`)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      pick(c, true);
                    }
                  }}
                  data-testid={`template-${key}`}
                  style={{
                    overflow: 'hidden',
                    border: `${active ? 2 : 1}px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`,
                    borderRadius: token.borderRadiusLG,
                  }}
                  styles={{ body: { padding: 12 } }}
                  cover={
                    <div className="relative overflow-hidden" style={{ height: 230 }}>
                      {cover && <FitScreen screen={cover} brand={c.skin.brand} />}
                      <div className="absolute top-2.5 left-2.5">
                        <Tag color="cyan" className="!m-0 text-xs">
                          {t(`templates.${c.templateKey}`)}
                        </Tag>
                      </div>
                      {active && (
                        <span
                          className="absolute top-2.5 right-2.5 flex items-center justify-center shadow-md"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: token.colorPrimary,
                            color: token.colorWhite,
                          }}
                        >
                          <Check className="size-3.5" />
                        </span>
                      )}
                    </div>
                  }
                >
                  <Flex vertical gap={4}>
                    <Typography.Text strong ellipsis>
                      {t(`skins.${c.skin.key}`)}
                    </Typography.Text>
                    <Caption>{t(`templates.${c.templateKey}`)}</Caption>
                    <Button
                      type={active ? 'primary' : 'default'}
                      size="small"
                      block
                      className="mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        pick(c, true);
                      }}
                    >
                      {t('useTemplate')}
                    </Button>
                  </Flex>
                </Card>
              );
            })}
          </div>

          <Flex
            gap={12}
            wrap
            align="center"
            justify="space-between"
            className="p-4 rounded-xl border mt-2"
            style={{ background: token.colorFillAlter, borderColor: token.colorBorderSecondary }}
          >
            <div className="min-w-0">
              <Typography.Text strong className="block">
                {picked
                  ? `${t(`templates.${picked.templateKey}`)} · ${t(`skins.${picked.skinKey}`)}`
                  : t('pickFirst')}
              </Typography.Text>
              <Caption>{picked ? name : t('namePlaceholder')}</Caption>
            </div>
            <Flex gap={8} align="center">
              <Button type="primary" disabled={!picked} onClick={() => setModalOpen(true)}>
                {t('createButton')}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        title={t('modalTitle')}
        centered
        width={480}
      >
        <Flex vertical gap={16} className="pt-2">
          <Typography.Paragraph type="secondary" className="!m-0">
            {t('modalSubtitle')}
          </Typography.Paragraph>

          {activeChoice && activeCover && (
            <Flex gap={16} align="center" className="p-3 rounded-lg border bg-secondary/5">
              <div
                className="shrink-0 overflow-hidden rounded-md shadow-sm"
                style={{ width: 60, height: 90 }}
              >
                <FitScreen screen={activeCover} brand={activeChoice.skin.brand} />
              </div>
              <div className="min-w-0">
                <Typography.Text strong className="block text-base">
                  {t(`templates.${activeChoice.templateKey}`)}
                </Typography.Text>
                <Caption className="block mb-1">{t(`skins.${activeChoice.skin.key}`)}</Caption>
                <Tag color="blue" className="!m-0">
                  {t(`occasions.${activeChoice.skin.occasion}`)}
                </Tag>
              </div>
            </Flex>
          )}

          <div>
            <Typography.Text strong className="block mb-1.5" style={{ fontSize: 13 }}>
              {t('nameLabel')}
            </Typography.Text>
            <Input
              aria-label={t('nameLabel')}
              placeholder={t('namePlaceholder')}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              onPressEnter={submit}
              size="large"
            />
          </div>

          <div>
            <Typography.Text strong className="block mb-1.5" style={{ fontSize: 13 }}>
              {t('brandKitLabel')}
            </Typography.Text>
            <Select
              className="w-full"
              size="large"
              value={selectedBrandKitId}
              onChange={setSelectedBrandKitId}
              placeholder={t('defaultBrandKit')}
              options={(brandKits.data?.items ?? []).map((kit) => ({
                value: kit.id,
                label: (
                  <Flex align="center" gap={8}>
                    <span
                      className="size-3.5 rounded-full shrink-0 border"
                      style={{ background: kit.tokens.colors.primary }}
                    />
                    <span>{kit.name}</span>
                  </Flex>
                ),
              }))}
            />
          </div>

          <Flex justify="end" gap={8} className="pt-3">
            <Button onClick={() => setModalOpen(false)}>{t('back')}</Button>
            <Button
              type="primary"
              size="large"
              disabled={!name.trim()}
              loading={create.isPending}
              onClick={submit}
            >
              {t('createButton')}
            </Button>
          </Flex>
        </Flex>
      </Modal>
    </>
  );
}
