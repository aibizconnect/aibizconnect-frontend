import * as React from 'react';

/**
 * Primary action button for AIBizConnect / ABC SalesMaster.
 *
 * @startingPoint section="Core" subtitle="Buttons — primary, secondary, ghost, danger" viewport="700x160"
 */
export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** Visual style. @default "primary" */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Control height & padding. @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Icon node rendered before the label. */
  leftIcon?: React.ReactNode;
  /** Icon node rendered after the label. */
  rightIcon?: React.ReactNode;
  /** Stretch to fill the container width. @default false */
  fullWidth?: boolean;
  /** Disable interaction & dim the button. @default false */
  disabled?: boolean;
  /** Show a spinner and block clicks. @default false */
  loading?: boolean;
  /** Render as an anchor instead of a button. @default "button" */
  as?: 'button' | 'a';
  /** href when rendered as an anchor. */
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
