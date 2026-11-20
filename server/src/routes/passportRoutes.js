import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { getPassportQr, getPublicPassport } from '../controllers/passportController.js';

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

router.get(
  '/:refId/qr',
  param('refId').matches(/^RW-\d{4}-[A-F0-9]+$/i).withMessage('Invalid textile reference'),
  validateRequest,
  getPassportQr
);

router.get(
  '/:refId',
  param('refId').matches(/^RW-\d{4}-[A-F0-9]+$/i).withMessage('Invalid textile reference'),
  validateRequest,
  getPublicPassport
);

export default router;
