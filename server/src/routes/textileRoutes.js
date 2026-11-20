import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createTextile,
  deleteTextile,
  getTextile,
  getTextileHistory,
  getTextileMatches,
  listTextiles,
  recommendTextile,
  requestMatch,
  updateTextile
} from '../controllers/textileController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { removeFiles, uploadPhotos } from '../middleware/upload.js';

const router = Router();
const materials = ['cotton', 'denim', 'polyester', 'wool', 'silk', 'nylon', 'mixed', 'unknown'];
const conditions = ['good', 'repairable', 'damaged', 'unknown'];
const units = ['items', 'kg'];
const statuses = ['registered', 'recommended', 'requested', 'collected', 'confirmed', 'awaiting_match', 'rejected', 'cancelled'];
const editableFields = ['itemType', 'material', 'condition', 'quantity', 'quantityUnit', 'estimatedWeightKg', 'location'];
const protectedFields = ['status', 'refId', 'owner', 'recommendedPathways', 'photos'];

const validateRequest = async (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    await removeFiles(req.files);
    return res.status(400).json({
      success: false,
      message: 'Please correct the highlighted fields',
      errors: result.array().map(({ path, msg }) => ({ field: path, message: msg }))
    });
  }
  return next();
};

const rejectUnexpectedFields = (allowed, required = false) => (req, _res, next) => {
  const invalidFields = Object.keys(req.body || {}).filter((field) => !allowed.includes(field));
  const errors = invalidFields.map((field) => ({
    type: 'field',
    path: field,
    msg: protectedFields.includes(field) ? `${field} cannot be set by the client` : `Unexpected field: ${field}`,
    location: 'body'
  }));
  if (req.body?.location && typeof req.body.location === 'object' && !Array.isArray(req.body.location)) {
    for (const field of Object.keys(req.body.location)) {
      if (!['city', 'state'].includes(field)) {
        errors.push({
          type: 'field',
          path: `location.${field}`,
          msg: `Unexpected field: location.${field}`,
          location: 'body'
        });
      }
    }
  }
  const hasEditableField = allowed.some((field) => Object.hasOwn(req.body || {}, field));
  if (required && !hasEditableField && !req.files?.length) {
    errors.push({ type: 'field', path: 'body', msg: 'At least one textile field or photo is required', location: 'body' });
  }
  req.unexpectedFieldErrors = errors;
  return next();
};

const validateWithUnexpectedFields = async (req, res, next) => {
  const errors = [...req.unexpectedFieldErrors, ...validationResult(req).array()];
  if (errors.length) {
    await removeFiles(req.files);
    return res.status(400).json({
      success: false,
      message: 'Please correct the highlighted fields',
      errors: errors.map(({ path, msg }) => ({ field: path, message: msg }))
    });
  }
  return next();
};

const requiredText = (field, label, max = 100) =>
  body(field).trim().notEmpty().withMessage(`${label} is required`).isLength({ max })
    .withMessage(`${label} must be ${max} characters or fewer`);

const optionalText = (field, max = 100) =>
  body(field).optional().trim().isLength({ max }).withMessage(`Must be ${max} characters or fewer`);

const createValidators = [
  requiredText('itemType', 'Item type'),
  body('material').isIn(materials).withMessage('Choose a valid material'),
  body('condition').isIn(conditions).withMessage('Choose a valid condition'),
  body('quantity').isFloat({ min: 1 }).withMessage('Quantity must be at least 1').toFloat(),
  body('quantityUnit').isIn(units).withMessage('Choose items or kg'),
  body('estimatedWeightKg').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Estimated weight must be zero or greater').toFloat(),
  body('location').isObject().withMessage('Location is required'),
  body('location.city').trim().notEmpty().withMessage('City is required').isLength({ max: 100 }),
  optionalText('location.state')
];

const updateValidators = [
  body('itemType').optional().trim().notEmpty().withMessage('Item type cannot be empty').isLength({ max: 100 }),
  body('material').optional().isIn(materials).withMessage('Choose a valid material'),
  body('condition').optional().isIn(conditions).withMessage('Choose a valid condition'),
  body('quantity').optional().isFloat({ min: 1 }).withMessage('Quantity must be at least 1').toFloat(),
  body('quantityUnit').optional().isIn(units).withMessage('Choose items or kg'),
  body('estimatedWeightKg').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Estimated weight must be zero or greater').toFloat(),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('location.city').optional().trim().notEmpty().withMessage('City cannot be empty').isLength({ max: 100 }),
  optionalText('location.state')
];

router.use(authenticate);

router.post(
  '/',
  authorize('individual', 'institution'),
  uploadPhotos,
  rejectUnexpectedFields(editableFields),
  ...createValidators,
  validateWithUnexpectedFields,
  createTextile
);

router.get(
  '/',
  query('status').optional().isIn(statuses).withMessage('Choose a valid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest,
  listTextiles
);

router.get('/:id/history', param('id').isMongoId().withMessage('Textile ID is invalid'), validateRequest, getTextileHistory);
router.get('/:id', param('id').isMongoId().withMessage('Textile ID is invalid'), validateRequest, getTextile);

router.put(
  '/:id',
  param('id').isMongoId().withMessage('Textile ID is invalid'),
  uploadPhotos,
  rejectUnexpectedFields(editableFields, true),
  ...updateValidators,
  validateWithUnexpectedFields,
  updateTextile
);

router.delete('/:id', param('id').isMongoId().withMessage('Textile ID is invalid'), validateRequest, deleteTextile);

// POST /:id/recommend — run the circularity engine for a registered or recommended textile.
// No body is accepted; the engine reads the textile's condition and material from the DB.
router.post(
  '/:id/recommend',
  param('id').isMongoId().withMessage('Textile ID is invalid'),
  (req, _res, next) => {
    // Block any body fields — pathways are engine-generated, never user-supplied
    req.unexpectedFieldErrors = Object.keys(req.body || {}).map((field) => ({
      type: 'field',
      path: field,
      msg: `${field} cannot be set by the client`,
      location: 'body'
    }));
    next();
  },
  validateWithUnexpectedFields,
  recommendTextile
);

// GET /:id/matches — find matched verified partners for a textile's recommended pathways
router.get('/:id/matches', param('id').isMongoId().withMessage('Textile ID is invalid'), validateRequest, getTextileMatches);

// POST /:id/request-match — request handover with a verified partner or flag as awaiting_match
router.post(
  '/:id/request-match',
  param('id').isMongoId().withMessage('Textile ID is invalid'),
  body('pathway').notEmpty().withMessage('Pathway is required'),
  body('partnerId').optional({ values: 'null' }).isMongoId().withMessage('Invalid partner ID'),
  validateRequest,
  requestMatch
);

export default router;