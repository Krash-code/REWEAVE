import { Router } from 'express';
import {
  getImpactByPathway,
  getImpactSummary,
  getInstitutionImpact,
  getMonthlyImpact
} from '../controllers/impactController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/summary', getImpactSummary);
router.get('/by-pathway', getImpactByPathway);
router.get('/monthly', getMonthlyImpact);
router.get('/institution', getInstitutionImpact);

export default router;
