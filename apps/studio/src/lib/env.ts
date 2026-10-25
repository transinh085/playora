export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const PLAY_URL = process.env.NEXT_PUBLIC_PLAY_URL ?? 'http://localhost:3002';
/** Labs prototypes (e.g. the ADR-014 canvas editor) are shown in dev or when explicitly enabled. */
export const LABS_ENABLED =
  process.env.NEXT_PUBLIC_STUDIO_LABS === '1' || process.env.NODE_ENV === 'development';
