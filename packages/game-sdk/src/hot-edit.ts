import { canonicalJson, getAtPath, setAtPath } from './config-path';

export interface HotEditableFieldLike {
  readonly path: string;
  readonly widget: string;
  readonly hotEditable: boolean;
  readonly fields?: readonly HotEditableFieldLike[];
}

export function extractHotConfig(
  config: Record<string, unknown>,
  hotEditablePaths: readonly string[],
): Record<string, unknown> {
  const hot: Record<string, unknown> = {};
  for (const path of hotEditablePaths) {
    const val = getAtPath(config, path);
    if (val !== undefined) {
      setAtPath(hot, path, structuredClone(val));
    }
  }
  return hot;
}

export function hasNonHotEditableChanges(
  fields: readonly HotEditableFieldLike[],
  draftConfig: Record<string, unknown>,
  publishedConfig: Record<string, unknown>,
): boolean {
  for (const field of fields) {
    if (field.hotEditable) {
      continue;
    }
    if (field.widget === 'object' && field.fields && field.fields.length > 0) {
      if (hasNonHotEditableChanges(field.fields, draftConfig, publishedConfig)) {
        return true;
      }
      continue;
    }
    const draftVal = getAtPath(draftConfig, field.path);
    const pubVal = getAtPath(publishedConfig, field.path);
    if (draftVal === pubVal) continue;
    if (draftVal === undefined || pubVal === undefined) return true;
    if (canonicalJson(draftVal) !== canonicalJson(pubVal)) {
      return true;
    }
  }
  return false;
}
