import { Card } from '@playora/ui/components';
import { cx } from '@playora/ui/utils/cx';
import type * as React from 'react';

const defaultStates = ['default', 'hover', 'focus', 'active', 'disabled'] as const;

export function StateMatrix<Row extends string>({
  rows,
  states = defaultStates,
  render,
  className,
}: {
  rows: readonly Row[];
  states?: readonly string[];
  render: (row: Row, state: string) => React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cx('w-full overflow-x-auto p-4', className)}>
      <table className="w-full border-separate border-spacing-x-3 border-spacing-y-3">
        <thead>
          <tr>
            <th className="w-28 text-left font-mono text-xs font-normal text-muted-foreground">
              variant \ state
            </th>
            {states.map((state) => (
              <th
                key={state}
                scope="col"
                className="text-left font-mono text-xs font-normal text-muted-foreground"
              >
                {state}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <th
                scope="row"
                className="pr-4 text-left font-mono text-xs font-medium text-foreground"
              >
                {row}
              </th>
              {states.map((state) => (
                <td key={state} className="align-middle">
                  {render(row, state)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/** Spread onto a component to pin an interaction state without user interaction. */
export function previewState(state: string): {
  disabled?: boolean;
  'data-preview'?: string;
} {
  if (state === 'disabled') {
    return { disabled: true };
  }
  if (['hover', 'focus', 'active'].includes(state)) {
    return { 'data-preview': state };
  }
  return {};
}
