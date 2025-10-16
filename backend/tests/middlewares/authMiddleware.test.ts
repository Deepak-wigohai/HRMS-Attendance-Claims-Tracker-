const jwt = require('jsonwebtoken');

// Mock the database pool
const mockPool = {
  query: jest.fn(),
};

// Mock the database module
jest.mock('../../src/config/db', () => mockPool);

// Import the auth middleware after mocking
const authMiddleware = require('../../src/middlewares/authMiddleware');

describe('Auth Middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Set up environment
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  describe('Token Validation', () => {
    it('should allow access with valid token', async () => {
      const token = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${token}`;

      // Mock database response - user is active
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ deleted_at: null }] 
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.user).toMatchObject({
        id: 1,
        email: 'test@example.com',
        role: 'user'
      });
    });

    it('should reject request without token', async () => {
      // No authorization header

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied, no token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      req.headers.authorization = 'InvalidToken';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied, no token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', async () => {
      req.headers.authorization = 'Bearer';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied, no token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired token
      );

      req.headers.authorization = `Bearer ${expiredToken}`;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with token signed with wrong secret', async () => {
      const invalidToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'user' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${invalidToken}`;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('User Status Validation', () => {
    it('should reject access for deactivated user', async () => {
      const token = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${token}`;

      // Mock database response - user is deactivated
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ deleted_at: '2023-01-01T00:00:00Z' }] 
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User is deactivated'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject access for non-existent user', async () => {
      const token = jwt.sign(
        { id: 999, email: 'nonexistent@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${token}`;

      // Mock database response - user doesn't exist
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User is deactivated'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access for active user', async () => {
      const token = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${token}`;

      // Mock database response - user is active
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ deleted_at: null }] 
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const token = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${token}`;

      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await authMiddleware(req, res, next);

      // Should still allow access despite database error
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle invalid user ID in token', async () => {
      const token = jwt.sign(
        { id: 'invalid', email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware(req, res, next);

      // Should still allow access despite invalid ID
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Token Payload Handling', () => {
    it('should set user data from token payload', async () => {
      const userData = {
        id: 123,
        email: 'admin@example.com',
        role: 'admin'
      };

      const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ deleted_at: null }] 
      });

      await authMiddleware(req, res, next);

      expect(req.user).toMatchObject(userData);
      expect(next).toHaveBeenCalled();
    });

    it('should handle token with minimal payload', async () => {
      const userData = {
        id: 1
      };

      const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      // Mock database response
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ deleted_at: null }] 
      });

      await authMiddleware(req, res, next);

      expect(req.user).toMatchObject(userData);
      expect(next).toHaveBeenCalled();
    });
  });
});
