import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { useFocusMode } from '@/shared/state/focusMode';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/dictionary';
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
  end: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: 'dashboard', end: true },
  { to: '/diagnostic', labelKey: 'nav.diagnostic', icon: 'diagnostic', end: false },
  { to: '/lessons', labelKey: 'nav.lessons', icon: 'lessons', end: false },
  { to: '/pbq', labelKey: 'nav.pbq', icon: 'pbq', end: false },
  { to: '/review', labelKey: 'nav.review', icon: 'review', end: false },
];

/**
 * Layout raíz con HTML semántico.
 *
 * En pantallas grandes la navegación vive en la cabecera; en móvil se convierte
 * en una barra inferior fija, siempre al alcance del pulgar.
 */
export function AppShell() {
  const focusMode = useFocusMode((state) => state.active);
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
            {NAV_ITEMS.map((item) => (
              <li key={item.to} className={styles.navItem}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
                >
                  <NavIcon name={item.icon} className={styles.navIcon} />
                  <span className={styles.navLabel}>{t(item.labelKey)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main-content" className={styles.main} tabIndex={-1}>
        {/* Si una sección revienta, la navegación sigue viva: el usuario puede
            irse a otra en lugar de quedarse ante una pantalla en blanco. */}
        <ErrorBoundary scope={t('shell.errorScope')}>
          <Suspense
            fallback={
              <p className={styles.loading} role="status">
                {t('shell.loading')}
              </p>
            }
          >
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className={styles.footer}>
        <p>{t('shell.footer')}</p>
        <p className={styles.footerLinks}>
          <NavLink to="/settings">{t('shell.footerSettings')}</NavLink>
        </p>
      </footer>
    </div>
  );
}
