import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getAdminAnalytics, listUsers, suspendPartner } from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const validateRequest = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please correct the highlighted fields',
      errors: result.array().map(({ path, msg }) => ({ field: path, message: msg }))
    });
  }
  return next();
};

router.use(authenticate, authorize('admin'));
router.get('/analytics', getAdminAnalytics);
router.get('/users', listUsers);
router.patch(
  '/partners/:id/suspend',
  param('id').isMongoId(),
  body('isActive').isBoolean().withMessage('isActive must be true or false'),
  validateRequest,
  suspendPartner
);

export default router;
