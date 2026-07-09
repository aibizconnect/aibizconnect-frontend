import * as React from 'react';

/** KPI / metric block — label, big value, and an optional trend delta. */
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  /** Trend value, e.g. "12.4%". Leading "-" reads as a decrease. */
  delta?: string;
  /** Force the arrow/color direction. Inferred from `delta` sign otherwise. */
  deltaDirection?: 'up' | 'down';
  /** Small leading icon in a tinted square. */
  icon?: React.ReactNode;
}

export function Stat(props: StatProps): JSX.Element;
