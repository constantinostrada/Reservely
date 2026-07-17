'use client';

import { ApiError } from '../api/http';
import styles from './ui.module.css';

/**
 * Renders an API failure for a form. Field-level validation errors
 * (ApiError.details, from the backend's zod schemas) are listed per field;
 * anything else falls back to the error message.
 */
export function FormErrorMessage({ error }: { error: Error }): JSX.Element {
  if (error instanceof ApiError && error.details.length > 0) {
    return (
      <div className={styles.errorBox} role="alert">
        <strong>Please fix the following:</strong>
        <ul>
          {error.details.map((detail) => (
            <li key={detail.field}>
              {detail.field ? `${detail.field}: ` : ''}
              {detail.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <p className={styles.errorBox} role="alert">
      {error.message}
    </p>
  );
}
