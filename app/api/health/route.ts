import { NextResponse } from 'next/server';

import { isDevelopment } from '@/app/utils/utils';

import pkg from '@/package.json';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // intentional error, uncomment to test error handling
    // throw new Error('Test error for health check');

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: pkg.version,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // log error to server console for debugging
    console.log('Health check error:', err);

    // only return error details in development for security reasons
    if (isDevelopment()) {
      return NextResponse.json(
        { status: 'error', message: err.message, stack: err.stack },
        { status: 500 }
      );
    }

    // in production, return a generic error message without details
    return NextResponse.json(
      { status: 'error', message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
