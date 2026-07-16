// Add custom jest matchers
// import '@testing-library/jest-dom';

// next/jest has already loaded .env at this point. Keep the real database
// URL around for opt-in integration tests (see
// src/infrastructure/__tests__/*.integration.test.ts) before pointing unit
// tests at a fake one so they can never touch a real database by accident.
if (!process.env.INTEGRATION_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.INTEGRATION_DATABASE_URL = process.env.DATABASE_URL;
}

// Mock environment variables
process.env.DATABASE_URL =
  'postgresql://test:test@localhost:5432/test?schema=public';
process.env.NODE_ENV = 'test';
