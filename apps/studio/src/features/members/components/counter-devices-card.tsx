'use client';

import { ApiError } from '@playora/api-client';
import type { CreatedCounterDevice } from '@playora/contracts';
import {
  AlertDialog,
  Button,
  Card,
  Chip,
  Input,
  Modal,
  QRCodeSvg,
  Skeleton,
  toast,
} from '@playora/ui/components';
import { Copy, Plus, QrCode, Smartphone, Trash2 } from '@playora/ui/icons';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { useCounterDevices, useCreateCounterDevice, useRevokeCounterDevice } from '../api';

export function CreateCounterDeviceDialog({
  orgId,
  maxDevices = 3,
  disabled = false,
}: {
  orgId: string;
  maxDevices?: number;
  disabled?: boolean;
}) {
  const t = useTranslations('members.counterDevices');
  const tCommon = useTranslations('common');
  const createDevice = useCreateCounterDevice(orgId);

  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [storeLabel, setStoreLabel] = useState('');
  const [created, setCreated] = useState<CreatedCounterDevice | null>(null);

  const reset = () => {
    setLabel('');
    setStoreLabel('');
    setCreated(null);
  };

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next);
    if (!next) reset();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    try {
      const result = await createDevice.mutateAsync({
        params: { orgId },
        body: {
          label: cleanLabel,
          ...(storeLabel.trim() ? { storeLabel: storeLabel.trim() } : {}),
        },
      });
      setCreated(result);
      toast.success(t('createdToast', { label: result.label }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t('limitReached', { max: maxDevices }));
      } else {
        toast.error(tCommon('unknownError'));
      }
    }
  };

  const pairingUrl =
    created && typeof window !== 'undefined'
      ? `${window.location.origin}/orgs/${orgId}/redeem?pair=${encodeURIComponent(created.pairingCode)}`
      : created
        ? `/orgs/${orgId}/redeem?pair=${encodeURIComponent(created.pairingCode)}`
        : '';

  const copyPairingUrl = async () => {
    if (!pairingUrl) return;
    try {
      await navigator.clipboard.writeText(pairingUrl);
      toast.success(t('copiedLink'));
    } catch {
      toast.info(pairingUrl);
    }
  };

  return (
    <>
      <Button
        size="sm"
        isDisabled={disabled}
        onClick={() => setIsOpen(true)}
        data-testid="add-counter-device-btn"
      >
        <QrCode className="size-4" />
        {t('add')}
      </Button>

      <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="md">
            <Modal.Dialog data-testid="counter-device-modal">
              <Modal.CloseTrigger />
              {!created ? (
                <form onSubmit={handleCreate}>
                  <Modal.Header>
                    <Modal.Heading>{t('add')}</Modal.Heading>
                    <p className="mt-1 text-body-2-regular text-text-secondary">
                      {t('description')}
                    </p>
                  </Modal.Header>
                  <Modal.Body className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="counter-device-label"
                        className="text-body-2-medium text-text-primary"
                      >
                        {t('labelField')}
                      </label>
                      <Input
                        id="counter-device-label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder={t('labelPlaceholder')}
                        maxLength={80}
                        fullWidth
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="counter-device-store"
                        className="text-body-2-medium text-text-primary"
                      >
                        {t('storeLabelField')}
                      </label>
                      <Input
                        id="counter-device-store"
                        value={storeLabel}
                        onChange={(e) => setStoreLabel(e.target.value)}
                        placeholder={t('storeLabelPlaceholder')}
                        maxLength={120}
                        fullWidth
                      />
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenChange(false)}>
                      {tCommon('cancel')}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      isDisabled={!label.trim() || createDevice.isPending}
                      data-testid="submit-counter-device-btn"
                    >
                      <Plus className="size-4" />
                      {t('createCta')}
                    </Button>
                  </Modal.Footer>
                </form>
              ) : (
                <>
                  <Modal.Header>
                    <Modal.Heading>{t('qrModalTitle')}</Modal.Heading>
                    <p className="mt-1 text-body-2-regular text-text-secondary">
                      {t('qrModalDescription', { label: created.label })}
                    </p>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col items-center gap-4 py-3">
                    <div
                      className="rounded-3xl border border-border bg-white p-4 shadow-sm"
                      data-testid="counter-device-pairing-qr"
                    >
                      <QRCodeSvg value={pairingUrl} size={200} />
                    </div>
                    <Caption className="text-center">{t('qrExpiresHint')}</Caption>
                    <div className="flex w-full items-center gap-2">
                      <Input
                        value={pairingUrl}
                        readOnly
                        fullWidth
                        className="font-mono text-xs"
                        data-testid="counter-device-pairing-link"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={copyPairingUrl}
                      >
                        <Copy className="size-4" />
                        {t('copyLink')}
                      </Button>
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button size="sm" onClick={() => handleOpenChange(false)}>
                      {tCommon('cancel')}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

export function CounterDevicesCard({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const t = useTranslations('members.counterDevices');
  const tCommon = useTranslations('common');
  const format = useFormatter();

  const devicesQuery = useCounterDevices(orgId, canManage);
  const revokeDevice = useRevokeCounterDevice(orgId);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!canManage) return null;

  if (devicesQuery.isPending) {
    return <Skeleton className="h-48 w-full rounded-3xl" />;
  }

  const items = devicesQuery.data?.items ?? [];
  const maxDevices = devicesQuery.data?.maxDevices ?? 1;
  const activeDevices = items.filter((d) => !d.revokedAt);

  const handleRevoke = async (deviceId: string) => {
    setBusyId(deviceId);
    try {
      await revokeDevice.mutateAsync({ params: { orgId, deviceId } });
      toast.success(t('revokedToast'));
    } catch {
      toast.error(tCommon('unknownError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="overflow-hidden p-0" data-testid="counter-devices-card">
      <Card.Header className="flex flex-wrap items-center justify-between gap-3 border-b border-separator-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Card.Title className="m-0 text-body-medium text-text-primary">{t('title')}</Card.Title>
            <Chip size="sm" variant="soft" color="default" className="tabular-nums">
              {t('usage', { active: activeDevices.length, max: maxDevices })}
            </Chip>
          </div>
          <Card.Description className="mt-0.5 text-caption-1-regular text-text-secondary">
            {t('description')}
          </Card.Description>
        </div>
        <CreateCounterDeviceDialog orgId={orgId} maxDevices={maxDevices} />
      </Card.Header>
      <Card.Content className="p-0">
        {activeDevices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Caption>{t('empty')}</Caption>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {activeDevices.map((device) => (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                data-testid={`counter-device-row-${device.id}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Smartphone className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body-2-semibold text-text-primary">{device.label}</span>
                      {device.storeLabel && (
                        <Chip size="sm" variant="soft" color="default">
                          {device.storeLabel}
                        </Chip>
                      )}
                      {device.paired ? (
                        <Chip size="sm" variant="soft" color="success">
                          {t('statusPaired')}
                        </Chip>
                      ) : (
                        <Chip size="sm" variant="soft" color="warning">
                          {t('statusPending')}
                        </Chip>
                      )}
                    </div>
                    <Caption className="block">
                      {device.lastUsedAt
                        ? t('lastUsed', {
                            time: format.dateTime(new Date(device.lastUsedAt), {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }),
                          })
                        : t('neverUsed')}
                    </Caption>
                  </div>
                </div>

                <AlertDialog>
                  <Button
                    variant="secondary"
                    size="sm"
                    isDisabled={busyId === device.id}
                    data-testid={`revoke-counter-device-${device.id}`}
                  >
                    <Trash2 className="size-3.5" />
                    {t('revoke')}
                  </Button>
                  <AlertDialog.Backdrop isDismissable>
                    <AlertDialog.Container size="sm">
                      <AlertDialog.Dialog>
                        <AlertDialog.CloseTrigger />
                        <AlertDialog.Header>
                          <AlertDialog.Icon status="danger" />
                          <AlertDialog.Heading>
                            {t('revokeConfirm', { label: device.label })}
                          </AlertDialog.Heading>
                        </AlertDialog.Header>
                        <AlertDialog.Footer>
                          <Button slot="close" variant="secondary" size="sm">
                            {tCommon('cancel')}
                          </Button>
                          <Button
                            slot="close"
                            variant="danger"
                            size="sm"
                            onPress={() => handleRevoke(device.id)}
                          >
                            {t('revoke')}
                          </Button>
                        </AlertDialog.Footer>
                      </AlertDialog.Dialog>
                    </AlertDialog.Container>
                  </AlertDialog.Backdrop>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}
