import CollectionDrive from '../models/CollectionDrive.js';
import { impactByPathway, monthlyImpact, summarizeImpact } from '../services/impactService.js';
import { findPartnerOrgForUser } from '../utils/partnerOrg.js';

function scopeForUser(user, { institutionId } = {}) {
  if (user.role === 'admin') {
    if (institutionId) return { textileFilter: { owner: institutionId } };
    return { textileFilter: {} };
  }
  if (user.role === 'institution') {
    return { textileFilter: { owner: user._id } };
  }
  if (user.role === 'partner') {
    return { textileFilter: {}, pickupFilter: {} };
  }
  return { textileFilter: { owner: user._id } };
}

async function scopedQuery(user) {
  const scope = scopeForUser(user);
  if (user.role === 'partner') {
    const org = await findPartnerOrgForUser(user);
    if (!org) return { error: 'No partner organization found for this account' };
    scope.pickupFilter = { partner: org._id };
    scope.textileFilter = { matchedPartner: org._id };
  }
  return { scope };
}

export async function getImpactSummary(req, res) {
  const { scope, error } = await scopedQuery(req.user);
  if (error) return res.status(403).json({ success: false, message: error });
  const summary = await summarizeImpact(scope);
  return res.json({
    success: true,
    data: {
      summary,
      note: 'Figures are verified textile recovery weights. CO₂ conversion factors are not applied.'
    }
  });
}

export async function getImpactByPathway(req, res) {
  const { scope, error } = await scopedQuery(req.user);
  if (error) return res.status(403).json({ success: false, message: error });
  const pathways = await impactByPathway(scope);
  return res.json({ success: true, data: { pathways } });
}

export async function getMonthlyImpact(req, res) {
  const { scope, error } = await scopedQuery(req.user);
  if (error) return res.status(403).json({ success: false, message: error });
  const months = await monthlyImpact(scope);
  return res.json({ success: true, data: { months } });
}

export async function getInstitutionImpact(req, res) {
  if (req.user.role !== 'admin' && req.user.role !== 'institution') {
    return res.status(403).json({ success: false, message: 'Institution impact is limited to institution and admin accounts' });
  }

  const institutionId = req.user.role === 'admin' ? req.query.institutionId : req.user._id;
  if (req.user.role === 'admin' && !institutionId) {
    return res.status(400).json({ success: false, message: 'institutionId is required for admin queries' });
  }

  const summary = await summarizeImpact({ textileFilter: { owner: institutionId } });
  const drives = await CollectionDrive.find({ institution: institutionId }).select('title status targetWeightKg');
  return res.json({ success: true, data: { summary, drives } });
}
