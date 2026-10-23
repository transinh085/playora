import { Injectable } from '@nestjs/common';
import type { TemplateSummary } from '@playora/contracts';
import { templates } from '@playora/templates/server';

@Injectable()
export class TemplatesService {
  list(): { items: TemplateSummary[] } {
    return {
      items: templates.map((t) => ({
        id: t.id,
        version: t.version,
        kind: t.kind,
        name: t.name,
        description: t.description,
        thumbnail: t.thumbnail,
        tags: [...t.tags],
        assetSlots: t.assetSlots.map((slot) => ({
          key: slot.key,
          label: slot.label,
          ...(slot.required !== undefined ? { required: slot.required } : {}),
          ...(slot.ratio !== undefined ? { ratio: slot.ratio } : {}),
          ...(slot.minPx !== undefined ? { minPx: slot.minPx } : {}),
          ...(slot.transparent !== undefined ? { transparent: slot.transparent } : {}),
          ...(slot.brandable !== undefined ? { brandable: slot.brandable } : {}),
          accept: [...slot.accept],
        })),
        skins: t.skins.map((skin) => ({
          key: skin.key,
          name: skin.name,
          tags: [...skin.tags],
        })),
        formDescriptor: structuredClone(t.formDescriptor),
        defaultConfig: structuredClone(t.defaultConfig) as Record<string, unknown>,
      })),
    };
  }
}
