import { NextResponse } from 'next/server';
import {
  DomainException,
  EntityNotFoundException,
  ValidationException,
} from '@domain/exceptions/DomainException';
import { ZodError } from 'zod';

export function handleError(error: unknown): NextResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  // Domain validation errors
  if (error instanceof ValidationException) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: error.message,
      },
      { status: 400 }
    );
  }

  // Entity not found
  if (error instanceof EntityNotFoundException) {
    return NextResponse.json(
      {
        error: 'Not found',
        message: error.message,
      },
      { status: 404 }
    );
  }

  // Other domain exceptions
  if (error instanceof DomainException) {
    return NextResponse.json(
      {
        error: 'Business rule violation',
        message: error.message,
      },
      { status: 422 }
    );
  }

  // Standard errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'Bad request',
        message: error.message,
      },
      { status: 400 }
    );
  }

  // Unknown errors
  console.error('Unexpected error:', error);
  return NextResponse.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    },
    { status: 500 }
  );
}
