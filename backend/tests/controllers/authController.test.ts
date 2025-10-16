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

// Import the auth controller after mocking
const { signup, login } = require('../../src/controllers/authController');

describe('Auth Controller', () => {
  let app: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.post('/signup', signup);
    app.post('/login', login);
    
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  describe('POST /signup', () => {
    it('should successfully register a new user', async () => {
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
        .post('/signup')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered');
      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com'
      });

      // Verify database calls
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return error if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123'
      };

      // Mock database response - user exists
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, email: 'existing@example.com' }] 
      });

      const response = await request(app)
        .post('/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User already exists');

      // Verify only one database call was made
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors during signup', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/signup')
        .send(userData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
      expect(response.body.error).toBe('Database connection failed');
    });

    it('should handle missing email or password', async () => {
      const userData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/signup')
        .send(userData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
    });
  });

  describe('POST /login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user'
      };

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.role).toBe('user');

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toMatchObject({
        id: 1,
        email: 'test@example.com',
        role: 'user'
      });

      // Verify database call
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
        ['test@example.com']
      );
    });

    it('should return error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      // Mock database response - no user found
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return error for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user'
      };

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should handle database errors during login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
      expect(response.body.error).toBe('Database connection failed');
    });

    it('should handle missing email or password', async () => {
      const loginData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
    });

    it('should handle user with admin role', async () => {
      const loginData = {
        email: 'admin@example.com',
        password: 'password123'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 2,
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      };

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.role).toBe('admin');

      // Verify token contains admin role
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toMatchObject({
        id: 2,
        email: 'admin@example.com',
        role: 'admin'
      });
    });

    it('should default role to user when not specified', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: hashedPassword
        // No role specified
      };

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('user');

      // Verify token defaults to user role
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.role).toBe('user');
    });
  });
});
