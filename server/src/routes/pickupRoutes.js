import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  cancelPickup,
  confirmCollection,
  confirmOutcome,
  createPickup,
  getMyPickups,
  getPartnerPickups,
  getPickupById,
  rejectPickup,
  schedulePickup
} from '../controllers/pickupController.js';
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

// Create / initiate pickup request
router.post(
  '/',
  body('textileId').isMongoId().withMessage('Valid textile ID is required'),
  body('partnerId').isMongoId().withMessage('Valid partner ID is required'),
  body('pathway').trim().notEmpty().withMessage('Pathway is required'),
  body('transferType').optional().isIn(['pickup', 'drop_off']).withMessage('Transfer type must be pickup or drop_off'),
  body('scheduledDate').optional().isISO8601().withMessage('Scheduled date must be a valid ISO date'),
  validateRequest,
  createPickup
);

// List owner's requests
router.get('/my', getMyPickups);

// List partner's incoming/assigned requests
router.get('/partner', getPartnerPickups);

// Get single request detail
router.get('/:id', param('id').isMongoId().withMessage('Invalid pickup request ID'), validateRequest, getPickupById);

// Schedule or update collection timing & address
router.patch(
  '/:id/schedule',
  param('id').isMongoId().withMessage('Invalid pickup request ID'),
  body('scheduledDate').optional().isISO8601().withMessage('Scheduled date must be a valid ISO date'),
  body('timeSlot').optional().isString().trim(),
  body('transferType').optional().isIn(['pickup', 'drop_off']),
  validateRequest,
  schedulePickup
);

// Confirm collection (Partner only)
router.patch('/:id/collect', param('id').isMongoId().withMessage('Invalid pickup request ID'), validateRequest, confirmCollection);

// Confirm final outcome (Partner only)
router.patch(
  '/:id/confirm',
  param('id').isMongoId().withMessage('Invalid pickup request ID'),
  body('actualWeightKg').isFloat({ min: 0 }).withMessage('Actual received weight is required'),
  body('finalPathway').trim().notEmpty().withMessage('Final circular pathway is required'),
  validateRequest,
  confirmOutcome
);

// Reject handover upon inspection (Partner only)
router.patch(
  '/:id/reject',
  param('id').isMongoId().withMessage('Invalid pickup request ID'),
  body('rejectionReason').trim().notEmpty().withMessage('Rejection reason is required'),
  validateRequest,
  rejectPickup
);

// Cancel pickup request (Owner only)
router.patch('/:id/cancel', param('id').isMongoId().withMessage('Invalid pickup request ID'), validateRequest, cancelPickup);

export default router;
