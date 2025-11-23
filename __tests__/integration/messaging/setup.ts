/**
 * Setup file for messaging integration tests
 * 
 * This file ensures the Prisma client is properly initialized
 * and connected before running tests.
 */

import { beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  // Ensure Prisma client is connected
  try {
    await prisma.$connect();
    console.log('Prisma client connected for messaging integration tests');
  } catch (error) {
    console.error('Failed to connect Prisma client:', error);
    throw error;
  }
});

afterAll(async () => {
  // Disconnect Prisma client after all tests
  await prisma.$disconnect();
  console.log('Prisma client disconnected');
});
