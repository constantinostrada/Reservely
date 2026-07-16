import styles from './page.module.css';

export default function Home(): JSX.Element {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Reservely</h1>
        <p className={styles.description}>
          A modern reservation management system built with clean architecture
        </p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>Architecture</h2>
            <p>
              Built with clean architecture principles, ensuring maintainable
              and testable code with clear separation of concerns.
            </p>
          </div>

          <div className={styles.card}>
            <h2>Tech Stack</h2>
            <ul>
              <li>Next.js 14</li>
              <li>TypeScript</li>
              <li>PostgreSQL</li>
              <li>Prisma ORM</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>API Endpoints</h2>
            <ul>
              <li>GET /api/reservations</li>
              <li>POST /api/reservations</li>
              <li>GET /api/reservations/[id]</li>
              <li>POST /api/reservations/[id]/confirm</li>
              <li>POST /api/reservations/[id]/cancel</li>
              <li>GET /api/tables</li>
              <li>POST /api/tables</li>
              <li>GET /api/health</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>Documentation</h2>
            <p>
              Check out the README.md and CLAUDE.md files for detailed
              documentation on the architecture and how to use this system.
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <p>
            Health Check:{' '}
            <a href="/api/health" target="_blank" rel="noopener noreferrer">
              /api/health
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
