import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { useFocusMode } from '@/shared/state/focusMode';
import { BrandMark } from './BrandMark';
import { NavIcon, type NavIconName } from './NavIcon';
import { ThemeToggle } from './ThemeToggle';
import { UnofficialBadge } from './UnofficialBadge';
import styles from './AppShell.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: NavIconName;
  end: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Panel', icon: 'dashboard', end: true },
  { to: '/diagnostic', label: 'Diagnóstico', icon: 'diagnostic', end: false },
  { to: '/lessons', label: 'Lecciones', icon: 'lessons', end: false },
  { to: '/pbq', label: 'Simulaciones', icon: 'pbq', end: false },
  { to: '/review', label: 'Repaso', icon: 'review', end: false },
];

/**
 * Layout raíz con HTML semántico.
 *
 * En pantallas grandes la navegación vive en la cabecera; en móvil se convierte
 * en una barra inferior fija, siempre al alcance del pulgar.
 */
export function AppShell() {
  const focusMode = useFocusMode((state) => state.active);

  return (
    <div className={clsx(styles.shell, focusMode && styles.focus)}>
      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>

      <header className={styles.header}>
        <div className={styles.brand}>
          <BrandMark className={styles.logo} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>ShieldUp</span>
            <span className={styles.brandMeta}>
              <span className={styles.brandTag}>Security+ SY0-701</span>
              <UnofficialBadge />
            </span>
          </span>
        </div>

        <ThemeToggle />

        <nav className={styles.nav} aria-label="Navegación principal">
          <ul className={styles.navList} role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.to} className={styles.navItem}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
                >
                  <NavIcon name={item.icon} className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>
          ShieldUp es un proyecto de estudio independiente y <strong>no está afiliado ni
          respaldado por CompTIA</strong>. CompTIA® y Security+® son marcas registradas de
          CompTIA, Inc. Verifica siempre el contenido contra las fuentes oficiales del examen.
        </p>
      </footer>
    </div>
  );
}
