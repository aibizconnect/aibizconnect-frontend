import * as React from 'react';

/** Checkbox with optional label and helper description. Controlled or uncontrolled. */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  /** Secondary line under the label. */
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
}

export function Checkbox(props: CheckboxProps): JSX.Element;
