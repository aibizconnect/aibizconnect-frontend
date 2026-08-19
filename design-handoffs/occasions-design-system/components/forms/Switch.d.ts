import * as React from 'react';

/** Toggle switch for on/off settings. Controlled or uncontrolled. */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  /** @default "md" */
  size?: 'sm' | 'md';
}

export function Switch(props: SwitchProps): JSX.Element;
