import type { ReactNode } from 'react';

export type NavIconName = 'dashboard' | 'diagnostic' | 'lessons' | 'review';

const PATHS: Record<NavIconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  diagnostic: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>
  ),
  lessons: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5V19" />
      <path d="M8.5 8h7M8.5 12h5" />
    </>
  ),
  review: (
    <>
      <rect x="3" y="6.5" width="12.5" height="12.5" rx="2" />
      <path d="M8 3.5h10.5a2 2 0 0 1 2 2V16" />
      <path d="M7 12.5h4.5" />
    </>
  ),
};

export interface NavIconProps {
  name: NavIconName;
  className?: string;
}

export function NavIcon({ name, className }: NavIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
