import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createPartner,
  getPartner,
  listPartners,
  updatePartner,
  verifyPartner
} from '../controllers/partnerController.js';
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

const validPathways = ['reuse', 'donation', 'resale', 'repair', 'upcycling', 'recycling', 'manual_assessment'];

router.use(authenticate);

// List partners (Public to authenticated users; non-admins only see verified partners)
router.get(
  '/',
  query('verificationStatus').optional().isIn(['pending', 'verified', 'rejected']),
  query('pathway').optional().isIn(validPathways),
  validateRequest,
  listPartners
);

// Get single partner
router.get('/:id', param('id').isMongoId().withMessage('Invalid partner ID'), validateRequest, getPartner);

// Create partner (Admins or partners)
router.post(
  '/',
  authorize('admin', 'partner'),
  body('name').trim().notEmpty().withMessage('Partner name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required'),
  body('location.city').trim().notEmpty().withMessage('City is required'),
  body('supportedPathways').isArray({ min: 1 }).withMessage('At least one supported pathway is required'),
  body('supportedPathways.*').isIn(validPathways).withMessage('Invalid pathway specified'),
  validateRequest,
  createPartner
);

// Update partner (Admin or partner owner)
router.put('/:id', param('id').isMongoId().withMessage('Invalid partner ID'), validateRequest, updatePartner);

// Admin-only: Verify partner status
router.patch(
  '/:id/verify',
  authorize('admin'),
  param('id').isMongoId().withMessage('Invalid partner ID'),
  body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
  body('verificationNotes').optional().isString().trim(),
  validateRequest,
  verifyPartner
);

export default router;
