import * as React from 'react';

/** Native-select dropdown styled to match Input, with a custom chevron. */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: React.CSSProperties;
  children?: React.ReactNode;
}

export function Select(props: SelectProps): JSX.Element;
