import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Employee } from '../models/index.js';
import { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_ops_roster_2026_d2c';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const { email, password } = LoginSchema.parse(req.body);

  const employee = await Employee.findOne({ email: email.toLowerCase() });
  if (!employee) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  // Verify password or default password123
  let isMatch = false;
  if (employee.password) {
    isMatch = await bcrypt.compare(password, employee.password);
  } else {
    isMatch = password === 'password123';
  }

  if (!isMatch) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = jwt.sign(
    {
      id: (employee._id as any).toString(),
      email: employee.email,
      name: employee.name,
      role: employee.role,
      podId: employee.podId ? (employee.podId as any).toString() : undefined,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: (employee._id as any).toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      podId: employee.podId,
    },
  });
}

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated.' });
    return;
  }

  const employee = await Employee.findById(req.user.id).select('-password');
  if (!employee) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json(employee);
}

export async function getDemoAccounts(req: Request, res: Response) {
  // Returns quick clickable login accounts for demo purposes
  const accounts = await Employee.find({
    email: { $in: ['manager@ops.com', 'lead.pod1@ops.com', 'riya.sharma@ops.com'] },
  }).select('name email role');

  res.json(accounts);
}
