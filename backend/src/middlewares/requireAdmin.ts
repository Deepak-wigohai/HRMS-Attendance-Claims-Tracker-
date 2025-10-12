import type { Request, Response, NextFunction } from "express";

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  const role = (req.user && (req.user as any).role) || 'user'
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}

module.exports = requireAdmin


