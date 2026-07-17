/**
 * Point the app's Prisma singleton at the real integration database BEFORE
 * any module that constructs it is imported.
 *
 * jest.setup.js stashes the real DATABASE_URL (loaded from .env) into
 * INTEGRATION_DATABASE_URL and then points DATABASE_URL at a fake one so unit
 * tests can never touch a real database by accident. The API integration
 * suite drives the actual Next.js route handlers, which resolve their Prisma
 * client from DATABASE_URL, so it needs the real URL back.
 *
 * Import this module FIRST in the integration test file: ES module side
 * effects run in import order, so this wins the race against the
 * infrastructure/database/prisma singleton that the route handlers pull in.
 */
if (process.env.INTEGRATION_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.INTEGRATION_DATABASE_URL;
}

export {};
