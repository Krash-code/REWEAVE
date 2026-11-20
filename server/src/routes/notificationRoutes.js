import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import {
  getNotifications,
  readAllNotifications,
  readNotification
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

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

router.use(authenticate);
router.get('/', getNotifications);
router.patch('/read-all', readAllNotifications);
router.patch(
  '/:id/read',
  param('id').isMongoId().withMessage('Invalid notification ID'),
  validateRequest,
  readNotification
);

export default router;
