module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        types: ['node', 'jest']
      }
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/realtime.ts',
    '!src/scheduler.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    // Map CommonJS modules to their ES6 equivalents for testing
    '^bcrypt$': '<rootDir>/node_modules/bcrypt',
    '^jsonwebtoken$': '<rootDir>/node_modules/jsonwebtoken',
    '^express$': '<rootDir>/node_modules/express',
    '^express-rate-limit$': '<rootDir>/node_modules/express-rate-limit',
    '^pg$': '<rootDir>/node_modules/pg',
    '^cors$': '<rootDir>/node_modules/cors',
    '^helmet$': '<rootDir>/node_modules/helmet',
    '^morgan$': '<rootDir>/node_modules/morgan',
    '^nodemailer$': '<rootDir>/node_modules/nodemailer',
    '^socket.io$': '<rootDir>/node_modules/socket.io',
    '^socket.io-client$': '<rootDir>/node_modules/socket.io-client',
    '^winston$': '<rootDir>/node_modules/winston',
    '^node-cron$': '<rootDir>/node_modules/node-cron',
    '^redis$': '<rootDir>/node_modules/redis',
    '^rate-limit-redis$': '<rootDir>/node_modules/rate-limit-redis',
    '^dotenv$': '<rootDir>/node_modules/dotenv',
    '^js-logger$': '<rootDir>/node_modules/js-logger',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  verbose: true,
};
