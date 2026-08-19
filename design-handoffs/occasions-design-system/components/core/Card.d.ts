import * as React from 'react';

/**
 * Surface container — the building block for dashboard panels, list rows, and content blocks.
 *
 * @startingPoint section="Core" subtitle="Card surface + header" viewport="700x220"
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inner padding. @default "md" */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Lift + shadow on hover (for clickable cards). @default false */
  interactive?: boolean;
  children?: React.ReactNode;
}
export function Card(props: CardProps): JSX.Element;

export interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned action node (button, menu, badge). */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}
export function CardHeader(props: CardHeaderProps): JSX.Element;
