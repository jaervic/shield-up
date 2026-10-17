import { NavLink, Outlet } from 'react-router-dom';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/review', label: 'Repaso', end: false },
];

/** Layout raíz con HTML semántico y navegación accesible. */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>

      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            🛡️
          </span>
          <div>
            <p className={styles.brandName}>ShieldUp</p>
            <p className={styles.brandTag}>CompTIA Security+ SY0-701</p>
          </div>
        </div>

        <nav aria-label="Navegación principal">
          <ul className={styles.navList} role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
                >
                  {item.label}
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
        <p>Contenido de estudio no oficial. Verifica siempre contra el examen oficial de CompTIA.</p>
      </footer>
    </div>
  );
}
