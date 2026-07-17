'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import styles from './AppShell.module.css';

// Extend as screens are added (reservations, tables, availability, …)
const NAV_ITEMS: { href: string; label: string }[] = [
  { href: '/', label: 'Dashboard' },
];

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async (): Promise<void> => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            Reservely
          </Link>
          <nav className={styles.nav} aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href ? styles.navLinkActive : styles.navLink
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.session}>
            <span className={styles.userName} title={user.email}>
              {user.name}
            </span>
            <span className={styles.userRole}>{user.role}</span>
            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
              disabled={signingOut}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
