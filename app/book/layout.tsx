import Link from 'next/link';
import styles from '@interfaces/web/features/booking/booking.module.css';

/**
 * Public storefront layout for the guest booking flow. Deliberately has no
 * AuthProvider or AppShell: these pages are open to anyone and never require
 * a session (see middleware PUBLIC_PREFIXES).
 */
export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <div className={styles.brandBar}>
        <div className={styles.brandBarInner}>
          <Link href="/book" className={styles.brand}>
            Reservely
          </Link>
          <span className={styles.brandTag}>Book a table</span>
        </div>
      </div>
      <main className={styles.page}>{children}</main>
    </div>
  );
}
