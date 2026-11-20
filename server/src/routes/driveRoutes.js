import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  createDrive,
  getDrive,
  getDriveReport,
  joinDrive,
  listDrives,
  submitTextileToDrive
} from '../controllers/driveController.js';
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

router.post(
  '/',
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('startDate').isISO8601().withMessage('Start date is required'),
  body('endDate').isISO8601().withMessage('End date is required'),
  body('location.city').trim().notEmpty().withMessage('City is required'),
  validateRequest,
  createDrive
);

router.get('/', listDrives);
router.get('/:id/report', param('id').isMongoId(), validateRequest, getDriveReport);
router.get('/:id', param('id').isMongoId(), validateRequest, getDrive);
router.post('/:id/join', param('id').isMongoId(), validateRequest, joinDrive);
router.post(
  '/:id/submit',
  param('id').isMongoId(),
  body('textileId').isMongoId().withMessage('Textile ID is required'),
  validateRequest,
  submitTextileToDrive
);

export default router;
