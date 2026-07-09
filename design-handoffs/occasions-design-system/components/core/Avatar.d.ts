import * as React from 'react';

/** Circular user avatar — image or auto-generated initials on the brand gradient. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name — used for initials fallback and alt text. */
  name?: string;
  /** Image URL; falls back to initials when absent. */
  src?: string;
  /** @default "md" */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Presence dot. */
  status?: 'online' | 'away' | 'offline';
}

export function Avatar(props: AvatarProps): JSX.Element;
