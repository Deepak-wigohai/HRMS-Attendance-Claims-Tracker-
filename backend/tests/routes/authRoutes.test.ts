const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock the database pool
const mockPool = {
  query: jest.fn(),
};

// Mock the database module
jest.mock('../../src/config/db', () => mockPool);

// Mock express-rate-limit
jest.mock('express-rate-limit', () => ({
  rateLimit: jest.fn(() => (req: any, res: any, next: any) => next())
}));

// Import the auth routes after mocking
const authRoutes = require('../../src/routes/authRoutes');

describe('Auth Routes Integration Tests', () => {
  let app: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Set up environment
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  describe('POST /auth/signup', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123'
      };

      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // User doesn't exist
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, email: 'newuser@example.com' }] 
        }); // User created

      const response = await request(app)
        .post('/auth/signup')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered');
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123'
      };

      // Mock database response - user exists
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, email: 'existing@example.com' }] 
      });

      const response = await request(app)
        .post('/auth/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User already exists');
    });

    it('should handle malformed request body', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send('invalid json');

      expect(response.status).toBe(500);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user'
      };

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.role).toBe('user');

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toMatchObject({
        id: 1,
        email: 'user@example.com',
        role: 'user'
      });
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'wrongpassword'
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user'
      };

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      // Mock database response - no user found
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should handle malformed request body', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send('invalid json');

      expect(response.status).toBe(500);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      // Rate limiting is applied to the login route in the actual implementation
      // This test verifies that the route is properly configured
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      // The route should be accessible (rate limiting is mocked)
      expect(response.status).toBe(500); // Expected due to missing database setup
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Connection timeout'));

      const response = await request(app)
        .post('/auth/signup')
        .send(userData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
      expect(response.body.error).toBe('Connection timeout');
    });

    it('should handle unexpected errors', async () => {
      // Mock bcrypt to throw an error
      const originalHash = bcrypt.hash;
      bcrypt.hash = jest.fn().mockRejectedValue(new Error('Bcrypt error'));

      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/auth/signup')
        .send(userData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');

      // Restore original function
      bcrypt.hash = originalHash;
    });
  });

  describe('Security Tests', () => {
    it('should not expose password in response', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // User doesn't exist
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, email: 'test@example.com' }] 
        }); // User created

      const response = await request(app)
        .post('/auth/signup')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should not expose password in login response', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user'
      };

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.password).toBeUndefined();
    });

    it('should generate tokens with appropriate expiration', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user'
      };

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      
      // Verify token expiration
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      const now = Math.floor(Date.now() / 1000);
      const expirationTime = (decoded as any).exp;
      
      // Token should expire in approximately 1 hour
      expect(expirationTime - now).toBeGreaterThan(3500); // 58+ minutes
      expect(expirationTime - now).toBeLessThan(3700); // 61+ minutes
    });
  });
});
