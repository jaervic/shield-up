/**
 * Marca de ShieldUp: escudo propio con una marca de verificación.
 *
 * Es un símbolo original, NO el logotipo de CompTIA. Hereda el color con
 * `currentColor` para que el tema lo controle.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.6l7.4 2.9v6.1c0 4.5-3 8.1-7.4 9.8-4.4-1.7-7.4-5.3-7.4-9.8V5.5z" />
      <path d="M8.7 12.1l2.3 2.3 4.4-4.5" />
    </svg>
  );
}
