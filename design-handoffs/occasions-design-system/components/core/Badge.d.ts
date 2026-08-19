import * as React from 'react';

/** Small pill label for statuses, counts, and categories. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color tone. @default "neutral" */
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
  /** Show a leading status dot. @default false */
  dot?: boolean;
  /** Solid fill instead of soft tint. @default false */
  solid?: boolean;
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): JSX.Element;
