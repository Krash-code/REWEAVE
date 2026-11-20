import mongoose from 'mongoose';
import Partner from '../models/Partner.js';
import PickupRequest from '../models/PickupRequest.js';
import Textile from '../models/Textile.js';
import TraceabilityEvent from '../models/TraceabilityEvent.js';
import { addEvent } from '../services/traceabilityService.js';
import { recommendPathways } from '../services/circularityEngine.js';
import { checkPartnerEligibility, matchTextileToPartners } from '../services/matchingEngine.js';
import { notifyUser } from '../services/notificationService.js';
import { ACTIVE_PICKUP_STATUSES } from '../services/pickupService.js';
import generateRefId from '../utils/generateRefId.js';
import { removeFiles, removePhotoUrls } from '../middleware/upload.js';
import { findPartnerOrgForUser } from '../utils/partnerOrg.js';

const editableFields = ['itemType', 'material', 'condition', 'quantity', 'quantityUnit', 'estimatedWeightKg'];

function photoUrls(files = []) {
  return files.map((file) => `/uploads/${file.filename}`);
}

export async function createTextile(req, res) {
  const id = new mongoose.Types.ObjectId();
  const textile = await Textile.create({
    _id: id,
    owner: req.user._id,
    itemType: req.body.itemType,
    material: req.body.material,
    condition: req.body.condition,
    quantity: req.body.quantity,
    quantityUnit: req.body.quantityUnit,
    estimatedWeightKg: req.body.estimatedWeightKg,
    location: req.body.location,
    photos: photoUrls(req.files),
    status: 'registered',
    recommendedPathways: [],
    refId: generateRefId(id)
  });

  await addEvent(textile._id, 'registered', req.user._id, 'Textile registered');
  return res.status(201).json({ success: true, data: { textile } });
}

export async function listTextiles(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const filter = {};

  if (req.user.role !== 'admin') filter.owner = req.user._id;
  if (req.query.status) filter.status = req.query.status;

  const [textiles, total] = await Promise.all([
    Textile.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Textile.countDocuments(filter)
  ]);

  return res.json({
    success: true,
    data: { textiles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
  });
}

async function findAuthorizedTextile(req, res, { ownerOnly = false } = {}) {
  const textile = await Textile.findById(req.params.id).populate('matchedPartner');
  if (!textile) {
    res.status(404).json({ success: false, message: 'Textile not found' });
    return null;
  }

  const isOwner = textile.owner.equals(req.user._id);
  if (isOwner) return textile;
  if (ownerOnly) {
    res.status(403).json({ success: false, message: 'You do not have access to this textile' });
    return null;
  }
  if (req.user.role === 'admin') return textile;

  if (req.user.role === 'partner') {
    const org = await findPartnerOrgForUser(req.user);
    const matchedId = textile.matchedPartner?._id || textile.matchedPartner;
    if (org && matchedId && org._id.equals(matchedId)) return textile;
  }

  res.status(403).json({ success: false, message: 'You do not have access to this textile' });
  return null;
}

export async function getTextile(req, res) {
  const textile = await findAuthorizedTextile(req, res);
  if (!textile) return;
  const pickup = await PickupRequest.findOne({ textile: textile._id }).sort({ createdAt: -1 })
    .populate('partner', 'name location email phone');
  return res.json({ success: true, data: { textile, pickup } });
}

export async function updateTextile(req, res) {
  const textile = await findAuthorizedTextile(req, res, { ownerOnly: true });
  if (!textile) return;
  if (textile.status !== 'registered') {
    await removeFiles(req.files);
    return res.status(400).json({ success: false, message: 'Only registered textiles can be edited' });
  }
  if (textile.photos.length + (req.files?.length || 0) > 5) {
    await removeFiles(req.files);
    return res.status(400).json({ success: false, message: 'A textile can have at most 5 photos' });
  }

  const updates = {};
  for (const field of editableFields) {
    if (Object.hasOwn(req.body, field)) updates[field] = req.body[field];
  }
  if (Object.hasOwn(req.body, 'location')) {
    updates.location = { ...textile.location.toObject(), ...req.body.location };
  }
  if (req.files?.length) updates.photos = [...textile.photos, ...photoUrls(req.files)];

  const updatedTextile = await Textile.findOneAndUpdate(
    { _id: textile._id, owner: req.user._id, status: 'registered' },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!updatedTextile) {
    await removeFiles(req.files);
    return res.status(400).json({ success: false, message: 'Only registered textiles can be edited' });
  }

  await addEvent(updatedTextile._id, 'updated', req.user._id, 'Textile details updated');
  return res.json({ success: true, data: { textile: updatedTextile } });
}

export async function deleteTextile(req, res) {
  const textile = await findAuthorizedTextile(req, res, { ownerOnly: true });
  if (!textile) return;
  if (textile.status !== 'registered') {
    return res.status(400).json({ success: false, message: 'Only registered textiles can be deleted' });
  }

  const result = await Textile.deleteOne({ _id: textile._id, owner: req.user._id, status: 'registered' });
  if (!result.deletedCount) {
    return res.status(400).json({ success: false, message: 'Only registered textiles can be deleted' });
  }
  await removePhotoUrls(textile.photos);
  return res.json({ success: true, data: { message: 'Textile deleted' } });
}

export async function getTextileHistory(req, res) {
  const textile = await findAuthorizedTextile(req, res);
  if (!textile) return;

  const events = await TraceabilityEvent.find({ textile: textile._id })
    .populate('actor', 'name')
    .sort({ createdAt: 1, _id: 1 });
  return res.json({ success: true, data: { events } });
}

/**
 * POST /api/textiles/:id/recommend
 * JWT-protected, owner only.
 * Allowed when status is "registered" or "recommended".
 * Runs the circularity engine, persists recommended pathways and updates status.
 * Returns entire textile including recommendations.
 */
export async function recommendTextile(req, res) {
  const textile = await findAuthorizedTextile(req, res, { ownerOnly: true });
  if (!textile) return;

  const allowedStatuses = ['registered', 'recommended'];
  if (!allowedStatuses.includes(textile.status)) {
    return res.status(400).json({
      success: false,
      message: `Recommendations can only be generated while the textile is registered or recommended (current status: ${textile.status})`
    });
  }

  // Run the pure engine — no DB access inside it
  const pathways = recommendPathways({ condition: textile.condition, material: textile.material });

  // Only pathways whose result is manual_assessment stay "registered"; everything else → "recommended"
  const isManualOnly =
    pathways.length === 1 && pathways[0].pathway === 'manual_assessment';
  const newStatus = isManualOnly ? textile.status : 'recommended';

  const updatedTextile = await Textile.findByIdAndUpdate(
    textile._id,
    { $set: { recommendedPathways: pathways, status: newStatus } },
    { new: true, runValidators: true }
  );

  const note = isManualOnly
    ? 'Engine suggested manual assessment only (condition unknown).'
    : `Engine suggested ${pathways.length} pathway(s): ${pathways.map((p) => p.pathway).join(', ')}.`;

  await addEvent(textile._id, 'pathways_recommended', req.user._id, note);

  return res.json({ success: true, data: { textile: updatedTextile } });
}

/**
 * GET /api/textiles/:id/matches
 * JWT-protected, owner or admin.
 * Evaluates verified partners against textile's recommended pathways.
 */
export async function getTextileMatches(req, res) {
  const textile = await findAuthorizedTextile(req, res);
  if (!textile) return;

  if (!textile.recommendedPathways || textile.recommendedPathways.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Circularity recommendations must be generated before finding matching partners'
    });
  }

  const verifiedPartners = await Partner.find({
    verificationStatus: 'verified',
    isActive: true
  });

  const matchResults = matchTextileToPartners(textile, verifiedPartners);

  return res.json({
    success: true,
    data: {
      textileId: textile._id,
      refId: textile.refId,
      status: textile.status,
      ...matchResults
    }
  });
}

/**
 * POST /api/textiles/:id/request-match
 * JWT-protected, owner only.
 * Allowed when status is "recommended" or "awaiting_match".
 */
export async function requestMatch(req, res) {
  const textile = await findAuthorizedTextile(req, res, { ownerOnly: true });
  if (!textile) return;

  const allowedStatuses = ['recommended', 'awaiting_match'];
  if (!allowedStatuses.includes(textile.status)) {
    return res.status(400).json({
      success: false,
      message: `Partner requests are only allowed when textile status is recommended or awaiting_match (current status: ${textile.status})`
    });
  }

  const { pathway, partnerId } = req.body;
  if (!pathway) {
    return res.status(400).json({ success: false, message: 'Pathway is required' });
  }

  const validPathways = (textile.recommendedPathways || []).map((p) => p.pathway);
  if (validPathways.length > 0 && !validPathways.includes(pathway)) {
    return res.status(400).json({
      success: false,
      message: `Selected pathway "${pathway}" is not among the recommended pathways for this textile`
    });
  }

  if (partnerId) {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Selected partner not found' });
    }

    const check = checkPartnerEligibility(textile, pathway, partner);
    if (!check.eligible) {
      return res.status(400).json({
        success: false,
        message: `Partner is not eligible for this textile: ${check.reason}`
      });
    }

    const claimed = await Textile.findOneAndUpdate(
      { _id: textile._id, owner: req.user._id, status: { $in: allowedStatuses } },
      { $set: { status: 'requested', selectedPathway: pathway, matchedPartner: partner._id } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({ success: false, message: 'This textile is no longer available for a partner request' });
    }

    if (claimed.estimatedWeightKg && claimed.estimatedWeightKg > 0) {
      await Partner.findByIdAndUpdate(partner._id, {
        $inc: { currentLoadKg: claimed.estimatedWeightKg }
      });
    }

    const existingPickup = await PickupRequest.findOne({
      textile: claimed._id,
      status: { $in: ACTIVE_PICKUP_STATUSES }
    });
    if (!existingPickup) {
      await PickupRequest.create({
        textile: claimed._id,
        owner: req.user._id,
        partner: partner._id,
        pathway,
        status: 'requested',
        pickupAddress: {
          city: claimed.location?.city,
          state: claimed.location?.state
        }
      });
    }

    await addEvent(
      claimed._id,
      'match_requested',
      req.user._id,
      `Requested handover with partner "${partner.name}" for "${pathway}".`
    );

    if (partner.user) {
      await notifyUser(partner.user, {
        type: 'pickup_requested',
        title: 'New handover request',
        message: `${req.user.name} requested ${claimed.refId} for ${pathway}.`,
        link: '/partner',
        relatedTextile: claimed._id
      });
    }
  } else {
    textile.status = 'awaiting_match';
    textile.selectedPathway = pathway;
    textile.matchedPartner = null;
    await textile.save();

    await addEvent(
      textile._id,
      'awaiting_match',
      req.user._id,
      `No partner currently available for "${pathway}". Flagged as awaiting partner match.`
    );
  }

  const updatedTextile = await Textile.findById(textile._id).populate('matchedPartner');
  return res.json({ success: true, data: { textile: updatedTextile } });
}