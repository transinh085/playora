import { ApiError } from '@playora/api-client';
import { ErrorCode } from '@playora/contracts';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Maps API errors onto form fields: VALIDATION_FAILED field errors and conflicts that name a
 * field (`details.field`). Returns false when nothing could be attached to a field.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  messageFor: (code: ErrorCode) => string,
): boolean {
  if (!(error instanceof ApiError)) return false;
  const details = error.details as
    | { field?: string; body?: { fieldErrors?: Record<string, string[]> } }
    | undefined;

  if (details?.field) {
    setError(details.field as Path<T>, { message: messageFor(error.code) });
    return true;
  }
  const fieldErrors = details?.body?.fieldErrors;
  if (error.code === ErrorCode.VALIDATION_FAILED && fieldErrors) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      setError(field as Path<T>, { message: messages[0] });
    }
    return Object.keys(fieldErrors).length > 0;
  }
  return false;
}
