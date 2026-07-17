import { AuthProvider } from '@interfaces/web/auth/AuthProvider';
import { AppShell } from '@interfaces/web/components/AppShell';

/**
 * Layout for every authenticated screen: loads the session (redirecting to
 * /login when there is none) and renders the shared navigation shell.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
