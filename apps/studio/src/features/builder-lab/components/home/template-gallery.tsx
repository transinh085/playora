'use client';

import { App, Button, Card, Flex, Input, Tag, Typography, theme } from 'antd';
import { Check, Sparkles } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Caption } from '@/components/caption';
import { useCreateCampaign } from '../../mock/hooks';
import { buildScreens, TEMPLATES } from '../../mock/templates';
import type { Occasion, SkinInfo, SkinKey, TemplateKey } from '../../mock/types';
import { FitScreen } from '../editor/fit-screen';

const OCCASIONS: Occasion[] = ['tet', 'opening', 'everyday'];

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
  const [occasion, setOccasion] = useState<Occasion | 'all'>('all');
  const [picked, setPicked] = useState<{ templateKey: TemplateKey; skinKey: SkinKey } | null>(null);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

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
  const visible = choices.filter((c) => occasion === 'all' || c.skin.occasion === occasion);

  const pick = (c: Choice) => {
    setPicked({ templateKey: c.templateKey, skinKey: c.skin.key });
    if (!nameTouched) {
      setName(
        t('defaultName', {
          template: t(`templates.${c.templateKey}`),
          skin: t(`skins.${c.skin.key}`),
        }),
      );
    }
  };

  const submit = async () => {
    if (!picked || !name.trim()) return;
    try {
      const campaign = await create.mutateAsync({ ...picked, name: name.trim() });
      message.success(t('created'));
      router.push(`/orgs/${orgId}/labs/builder/${campaign.id}` as Route);
    } catch {
      message.error(t('createFailed'));
    }
  };

  return (
    <Card
      variant="borderless"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      title={
        <Flex align="center" gap={8}>
          <Sparkles className="size-4" />
          {t('create.title')}
        </Flex>
      }
      extra={
        <Flex gap={6} wrap>
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
      }
    >
      <Flex vertical gap={20}>
        <Caption>{t('create.hint')}</Caption>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}
        >
          {visible.map((c) => {
            const key = `${c.templateKey}:${c.skin.key}`;
            const active = picked?.templateKey === c.templateKey && picked.skinKey === c.skin.key;
            const cover = covers.get(key);
            return (
              <Card
                key={key}
                hoverable
                variant="borderless"
                onClick={() => pick(c)}
                // Selectable with the keyboard too: the card acts as a toggle button.
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`${t(`templates.${c.templateKey}`)} · ${t(`skins.${c.skin.key}`)}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    pick(c);
                  }
                }}
                data-testid={`template-${key}`}
                style={{
                  overflow: 'hidden',
                  border: `${active ? 2 : 1}px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`,
                }}
                styles={{ body: { padding: 12 } }}
                cover={
                  <div className="relative" style={{ height: 220 }}>
                    {cover && <FitScreen screen={cover} brand={c.skin.brand} />}
                    {active && (
                      <span
                        className="absolute top-2 right-2 flex items-center justify-center"
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
                {/* Ellipsis Text renders inline-block, so stack explicitly. */}
                <Flex vertical>
                  <Typography.Text strong ellipsis>
                    {t(`templates.${c.templateKey}`)}
                  </Typography.Text>
                  <Caption>{t(`skins.${c.skin.key}`)}</Caption>
                </Flex>
              </Card>
            );
          })}
        </div>
        <Flex gap={8} wrap align="center">
          <Input
            aria-label={t('nameLabel')}
            placeholder={picked ? t('namePlaceholder') : t('pickFirst')}
            disabled={!picked}
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
            onPressEnter={submit}
            style={{ maxWidth: 360 }}
          />
          <Button
            type="primary"
            disabled={!picked || !name.trim()}
            loading={create.isPending}
            onClick={submit}
          >
            {t('createButton')}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
