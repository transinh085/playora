import { createHash, createHmac } from 'node:crypto';
import type { ApiEnv } from '@playora/env';
import { S3Client } from 'bun';

export type S3Config = Pick<
  ApiEnv,
  'S3_ENDPOINT' | 'S3_BUCKET' | 'S3_ACCESS_KEY' | 'S3_SECRET_KEY'
>;

export function createS3Client(env: S3Config): S3Client {
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  });
}

/**
 * Idempotently creates the configured S3/MinIO bucket in development and test environments.
 * Uses AWS Signature V4 (`PUT /{bucket}`) so no external S3 SDK dependency is required.
 */
export async function ensureS3Bucket(env: S3Config): Promise<void> {
  const region = 'auto';
  const url = new URL(`/${env.S3_BUCKET}`, env.S3_ENDPOINT);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = createHash('sha256').update('').digest('hex');
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const hmac = (key: Buffer | string, data: string) =>
    createHmac('sha256', key).update(data).digest();
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${env.S3_SECRET_KEY}`, dateStamp), region), 's3'),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${env.S3_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      authorization,
    },
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to ensure S3 bucket ${env.S3_BUCKET}: ${res.status}`);
  }
}
