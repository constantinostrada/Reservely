'use client';

import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@interfaces/web/api/client';
import { useApiMutation } from '@interfaces/web/hooks/useApiMutation';
import styles from './login.module.css';

export default function LoginPage(): JSX.Element {
  return (
    // useSearchParams requires a Suspense boundary in the app router
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useApiMutation(api.auth.login);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const result = await login.mutate({ email, password });
    if (result) {
      router.replace(safeNextPath(searchParams.get('next')));
      router.refresh();
    }
  };

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Reservely</h1>
        <p className={styles.subtitle}>Sign in to manage your restaurant</p>

        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {login.error && (
          <p className={styles.error} role="alert">
            {login.error.message}
          </p>
        )}

        <button
          type="submit"
          className={styles.submit}
          disabled={login.isPending}
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

/** Only allow same-origin relative paths as a post-login destination. */
function safeNextPath(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/';
}
