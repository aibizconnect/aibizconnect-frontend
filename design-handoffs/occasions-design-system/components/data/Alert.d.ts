import * as React from 'react';

/** Inline message banner for info, success, warning, and error states. */
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default "info" */
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: React.ReactNode;
  /** Dismiss handler — shows a close button when provided. */
  onClose?: () => void;
  children?: React.ReactNode;
}

export function Alert(props: AlertProps): JSX.Element;
