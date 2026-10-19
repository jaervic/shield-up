import { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useFocusMode } from '@/shared/state/focusMode';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/dictionary';
import { LoadingSkeleton } from '@/shared/ui/Skeleton';
import { ErrorBoundary } from '../ErrorBoundary';
import { BrandMark } from './BrandMark';
import { NavIcon, type NavIconName } from './NavIcon';
import { ThemeToggle } from './ThemeToggle';
import { UnofficialBadge } from './UnofficialBadge';
import styles from './AppShell.module.css';

interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: NavIconName;
  /**
   * Prefijos que también marcan este ítem como activo.
   *
   * "Evaluación" agrupa tres rutas (diagnóstico, simulacro y PBQ) que viven en
   * URLs propias: sin esto, la barra se apagaría al entrar en cualquiera de
   * ellas.
   */
  match: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: 'dashboard', match: [] },
  {
    to: '/evaluation',
    labelKey: 'nav.evaluation',
    icon: 'evaluation',
    match: ['/diagnostic', '/exam', '/pbq'],
  },
  { to: '/lessons', labelKey: 'nav.lessons', icon: 'lessons', match: [] },
  { to: '/review', labelKey: 'nav.review', icon: 'review', match: [] },
];

function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.to === '/') return pathname === '/';
  if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true;
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Layout raíz con HTML semántico.
 *
 * En pantallas grandes la navegación vive en la cabecera; en móvil se convierte
 * en una barra inferior fija, siempre al alcance del pulgar. Cuatro secciones es
 * el máximo que cabe sin truncar las etiquetas: el diagnóstico, el simulacro y
 * las PBQ se agrupan bajo "Evaluación".
 */
export function AppShell() {
  const focusMode = useFocusMode((state) => state.active);
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <div className={clsx(styles.shell, focusMode && styles.focus)}>
      <a className="skip-link" href="#main-content">
        {t('shell.skip')}
      </a>

      <header className={styles.header}>
        <div className={styles.brand}>
          <BrandMark className={styles.logo} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>ShieldUp</span>
            <span className={styles.brandMeta}>
              <span className={styles.brandTag}>{t('brand.tagline')}</span>
              <UnofficialBadge />
            </span>
          </span>
        </div>

        <ThemeToggle />

        <nav className={styles.nav} aria-label={t('nav.label')}>
          <ul className={styles.navList} role="list">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(item, pathname);

              return (
                <li key={item.to} className={styles.navItem}>
                  <Link
                    to={item.to}
                    className={active ? styles.navLinkActive : styles.navLink}
                    aria-current={active ? 'page' : undefined}
                  >
                    <NavIcon name={item.icon} className={styles.navIcon} />
                    <span className={styles.navLabel}>{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main id="main-content" className={styles.main} tabIndex={-1}>
        {/* Si una sección revienta, la navegación sigue viva: el usuario puede
            irse a otra en lugar de quedarse ante una pantalla en blanco. */}
        <ErrorBoundary scope={t('shell.errorScope')}>
          <Suspense fallback={<LoadingSkeleton label={t('shell.loading')} lines={2} />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className={styles.footer}>
        <p>{t('shell.footer')}</p>
        <p className={styles.footerLinks}>
          <Link to="/settings">{t('shell.footerSettings')}</Link>
        </p>
      </footer>
    </div>
  );
}
