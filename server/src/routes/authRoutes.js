import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { getCurrentUser, login, register } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please correct the highlighted fields',
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg }))
    });
  }
  return next();
};

router.post(
  '/register',
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['individual', 'institution', 'partner']).withMessage('Choose a valid account type'),
  validateRequest,
  register
);

router.post(
  '/login',
  body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
  login
);

router.get('/me', authenticate, getCurrentUser);

export default router;