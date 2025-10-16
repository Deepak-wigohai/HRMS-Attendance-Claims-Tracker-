// Test setup file
const dotenv = require('dotenv');

// Load environment variables for testing
try {
  dotenv.config({ path: '.env.test' });
} catch (error) {
  // Ignore if .env.test doesn't exist
}

// Set default environment variables for testing
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
