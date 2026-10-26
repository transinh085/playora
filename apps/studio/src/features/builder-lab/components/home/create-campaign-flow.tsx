'use client';

import { Button, Flex } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PLAYBOOK_KEYS, type PlaybookKey } from '../../lib/playbooks';
import { GoalPicker } from './goal-picker';
import { PlaybookSetupForm } from './playbook-setup';
import { TemplateGallery } from './template-gallery';

const isPlaybook = (value: string | null): value is PlaybookKey =>
  PLAYBOOK_KEYS.includes(value as PlaybookKey);

/**
 * New campaign (docs/product/specs/playbooks.md §2.1): goal first ("Bạn muốn gì?"), then the
 * playbook setup with its suggestion, then the editor. "Tự chọn mẫu" opens the template gallery.
 * The step lives in the URL (`?playbook=…`, `?start=templates`) so Back works.
 */
export function CreateCampaignFlow({ orgId }: { orgId: string }) {
  const t = useTranslations('builderLab.playbooks');
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const go = (query: string) => router.push(`${pathname}${query}` as never);

  const playbook = params.get('playbook');
  if (isPlaybook(playbook)) {
    return (
      <PlaybookSetupForm key={playbook} orgId={orgId} playbook={playbook} onBack={() => go('')} />
    );
  }
  if (params.get('start') === 'templates') {
    return (
      <Flex vertical gap={16}>
        <div>
          <Button icon={<ArrowLeft className="size-4" />} onClick={() => go('')}>
            {t('backToGoals')}
          </Button>
        </div>
        <TemplateGallery orgId={orgId} />
      </Flex>
    );
  }
  return (
    <GoalPicker onPick={(key) => go(`?playbook=${key}`)} onCustom={() => go('?start=templates')} />
  );
}
