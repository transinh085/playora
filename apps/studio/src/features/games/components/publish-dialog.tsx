'use client';

import { Button, Modal, Typography } from 'antd';
import { useTranslations } from 'next-intl';

export function PublishDialog({
  open,
  nextVersionNumber,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  nextVersionNumber: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations();

  return (
    <Modal
      title={t('games.publishConfirmTitle', { version: nextVersionNumber })}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div data-testid="publish-confirm-dialog" className="flex flex-col gap-4">
        <Typography.Text type="secondary">
          {t('games.publishConfirmDescription', { version: nextVersionNumber })}
        </Typography.Text>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            data-testid="confirm-publish-button"
            loading={isSubmitting}
            onClick={onConfirm}
          >
            {t('games.publishConfirmAction', { version: nextVersionNumber })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
