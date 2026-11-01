'use client';

import { Button, Card, Input, TextArea, Tooltip, toast } from '@playora/ui/components';
import { ImageIcon, ImageUp, WandSparkles } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Caption } from '@/components/caption';
import { AssetPickerModal } from '@/features/assets/components/asset-picker-modal';
import { IMAGE_PRESETS, type SlotKey } from '@/features/canvas-editor/lib/model';
import { uploadCampaignImage } from '../../lib/upload-image';
import { SLOT_KIND } from './slots';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Keys of `IMAGE_PRESETS` that have a translated name. */
type PresetKey =
  | 'logo'
  | 'trophy'
  | 'fire'
  | 'diamond'
  | 'ribbon'
  | 'apricot'
  | 'envelope'
  | 'lantern'
  | 'coin'
  | 'coffee'
  | 'gift'
  | 'star'
  | 'balloon';

/** One replaceable slot: change it here and every screen that shows it follows. */
export function SlotCard({
  orgId,
  slot,
  value,
  usage,
  onChange,
  onFocus,
  onSuggestPalette,
}: {
  orgId: string;
  slot: SlotKey;
  value: string;
  usage: number;
  onChange: (value: string) => void;
  /** Lets the preview jump to a screen that shows this slot. */
  onFocus?: () => void;
  /** Optional callback to suggest a 5-color brand palette from the logo image (BLD-27). */
  onSuggestPalette?: (imageUrl: string) => void;
}) {
  const t = useTranslations('builderLab.quickEdit');
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kind = SLOT_KIND[slot];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(t('tooLarge'));
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCampaignImage(orgId, file);
      onChange(url);
    } catch {
      toast.error(t('uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="gap-2.5 p-3.5" onFocus={onFocus} data-testid={`slot-${slot}`}>
      <Card.Header className="flex flex-row items-baseline justify-between gap-2 p-0">
        <Card.Title className="m-0 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
          {t(`slots.${slot}`)}
        </Card.Title>
        <Caption>{t('usage', { count: usage })}</Caption>
      </Card.Header>
      <Card.Content className="space-y-2.5 p-0">
        {kind === 'image' ? (
          <div className="flex items-center gap-3">
            <div className="flex size-[64px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50/50 dark:border-white/10 dark:bg-white/[0.02]">
              {/* biome-ignore lint/performance/noImgElement: data-URL uploads and stickers */}
              <img src={value} alt={t(`slots.${slot}`)} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isDisabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 rounded-md text-xs"
                >
                  <ImageUp className="mr-1.5 size-3.5" />
                  {t('upload')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  className="h-8 rounded-md text-xs"
                >
                  <ImageIcon className="mr-1.5 size-3.5" />
                  {t('chooseFromLibrary')}
                </Button>
              </div>
              {slot === 'logo' && value && onSuggestPalette && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSuggestPalette(value)}
                  className="h-7 rounded-md px-2 text-xs text-accent"
                >
                  <WandSparkles className="mr-1.5 size-3.5" />
                  {t('suggestPaletteFromLogo')}
                </Button>
              )}
              <Caption>{t('uploadHint')}</Caption>
              <AssetPickerModal
                orgId={orgId}
                isOpen={pickerOpen}
                onOpenChange={setPickerOpen}
                selectedUrl={value}
                onSelect={(_asset, publicUrl) => onChange(publicUrl)}
              />
            </div>
          </div>
        ) : kind === 'text' ? (
          <div className="space-y-1">
            <TextArea
              aria-label={t(`slots.${slot}`)}
              value={value}
              rows={3}
              maxLength={slot === 'title' ? 60 : 160}
              onChange={(e) => onChange(e.target.value)}
              fullWidth
              className="resize-none text-xs"
            />
            <div className="text-right text-neutral-400 text-xs">
              {value.length} / {slot === 'title' ? 60 : 160}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Input
              aria-label={t(`slots.${slot}`)}
              value={value}
              maxLength={24}
              onChange={(e) => onChange(e.target.value)}
              fullWidth
              className="text-xs"
            />
            <div className="text-right text-neutral-400 text-xs">{value.length} / 24</div>
          </div>
        )}

        {kind === 'image' && (
          <div>
            <Caption className="mb-1.5 block">{t('stickers')}</Caption>
            <div className="flex flex-wrap gap-1.5">
              {IMAGE_PRESETS.map((preset) => {
                const active = preset.src === value;
                const label = t(`presets.${preset.key as PresetKey}`);
                return (
                  <Tooltip key={preset.key} delay={150}>
                    <Tooltip.Trigger>
                      <button
                        type="button"
                        aria-label={label}
                        aria-pressed={active}
                        title={label}
                        onClick={() => onChange(preset.src)}
                        className={`flex size-9 cursor-pointer items-center justify-center rounded-md border p-1 transition-colors ${
                          active
                            ? 'border-neutral-900 bg-neutral-100 ring-1 ring-neutral-900/10 dark:border-white dark:bg-white/10 dark:ring-white/20'
                            : 'border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20'
                        }`}
                      >
                        {/* biome-ignore lint/performance/noImgElement: built-in sticker */}
                        <img src={preset.src} alt="" className="size-full object-contain" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>{label}</Tooltip.Content>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
