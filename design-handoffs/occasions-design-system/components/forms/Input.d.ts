import * as React from 'react';

/**
 * Text input with optional label, hint/error, and inline icons.
 *
 * @startingPoint section="Forms" subtitle="Text field with label, icon & error" viewport="700x140"
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  /** Helper text below the field. */
  hint?: string;
  /** Error message — turns the field red and replaces the hint. */
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
