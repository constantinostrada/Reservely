import { NextResponse } from 'next/server';
import {
  ConflictException,
  DomainException,
  EntityNotFoundException,
  ForbiddenException,
  UnauthorizedException,
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

  // Not authenticated
  if (error instanceof UnauthorizedException) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: error.message,
      },
      { status: 401 }
    );
  }

  // Authenticated but not allowed (e.g. cross-tenant access)
  if (error instanceof ForbiddenException) {
    return NextResponse.json(
      {
        error: 'Forbidden',
        message: error.message,
      },
      { status: 403 }
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

  // Duplicate resource (e.g. slug or table number already taken)
  if (error instanceof ConflictException) {
    return NextResponse.json(
      {
        error: 'Conflict',
        message: error.message,
      },
      { status: 409 }
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
