'use client';

import { ALLOWED_ASSET_MIMES, assetsApi, MAX_ASSET_BYTES } from '@playora/contracts';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

export { MAX_ASSET_BYTES };

/**
 * Uploads an image file through `assetsApi` (createUpload → PUT → completeUpload) and returns the
 * stored asset URL so campaign documents never persist `data:` URLs.
 */
export async function uploadCampaignImage(orgId: string, file: File): Promise<string> {
  const mime = ALLOWED_ASSET_MIMES.image.includes(file.type) ? file.type : 'image/png';
  const ticket = await api.call(assetsApi.createUpload, {
    params: { orgId },
    body: {
      kind: 'image',
      mime,
      bytes: file.size || 1,
      filename: file.name || 'image.png',
    },
  });
  const putRes = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: ticket.headers,
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status})`);
  }
  const asset = await api.call(assetsApi.completeUpload, {
    params: { orgId, assetId: ticket.assetId },
    body: {},
  });
  return asset.url;
}

export function useUploadCampaignImage(orgId?: string) {
  const params = useParams<{ orgId?: string }>();
  const resolvedOrgId = orgId ?? (typeof params?.orgId === 'string' ? params.orgId : '');
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File): Promise<string> => {
    if (!resolvedOrgId) {
      throw new Error('Missing organization id for image upload');
    }
    setIsUploading(true);
    try {
      return await uploadCampaignImage(resolvedOrgId, file);
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
}
