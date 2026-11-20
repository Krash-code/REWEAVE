import Partner from '../models/Partner.js';
import PickupRequest from '../models/PickupRequest.js';
import Textile from '../models/Textile.js';
import { notifyUser } from '../services/notificationService.js';
import {
  ACTIVE_PICKUP_STATUSES,
  validateInspectionDetails,
  validateRejectionDetails,
  validateScheduledDate,
  validateStatusTransition
} from '../services/pickupService.js';
import { addEvent } from '../services/traceabilityService.js';
import { findPartnerOrgForUser } from '../utils/partnerOrg.js';

async function authorizePickupAccess(req, pickup, { partnerOnly = false } = {}) {
  const isOwner = pickup.owner.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';

  let isAssignedPartner = false;
  if (req.user.role === 'partner' || isAdmin) {
    if (isAdmin) {
      isAssignedPartner = true;
    } else {
      const partnerOrg = await findPartnerOrgForUser(req.user);
      if (partnerOrg && pickup.partner.equals(partnerOrg._id)) {
        isAssignedPartner = true;
      }
    }
  }

  if (partnerOnly) return isAssignedPartner;
  return isOwner || isAssignedPartner;
}

async function releasePartnerLoad(pickup) {
  const textile = await Textile.findById(pickup.textile).select('estimatedWeightKg');
  const load = textile?.estimatedWeightKg;
  if (load && load > 0) {
    await Partner.findByIdAndUpdate(pickup.partner, { $inc: { currentLoadKg: -load } });
  }
}

/**
 * POST /api/pickups
 */
export async function createPickup(req, res) {
  const {
    textileId,
    partnerId,
    pathway,
    transferType = 'pickup',
    scheduledDate,
    timeSlot,
    pickupAddress,
    notes
  } = req.body;

  const textile = await Textile.findById(textileId);
  if (!textile) {
    return res.status(404).json({ success: false, message: 'Textile not found' });
  }

  if (!textile.owner.equals(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not have access to this textile' });
  }

  const allowedTextileStatuses = ['recommended', 'awaiting_match', 'requested'];
  if (!allowedTextileStatuses.includes(textile.status)) {
    return res.status(400).json({
      success: false,
      message: `Pickup can only be requested for recommended or requested textiles (current status: ${textile.status})`
    });
  }

  const partner = await Partner.findById(partnerId);
  if (!partner || partner.verificationStatus !== 'verified' || partner.isActive === false) {
    return res.status(400).json({
      success: false,
      message: 'Selected partner is not verified or inactive'
    });
  }

  if (scheduledDate) {
    const dateCheck = validateScheduledDate(scheduledDate);
    if (!dateCheck.valid) {
      return res.status(400).json({ success: false, message: dateCheck.error });
    }
  }

  const existing = await PickupRequest.findOne({
    textile: textile._id,
    status: { $in: ACTIVE_PICKUP_STATUSES }
  });

  const initialStatus = scheduledDate ? 'scheduled' : 'requested';
  const payload = {
    textile: textile._id,
    owner: textile.owner,
    partner: partner._id,
    pathway,
    transferType,
    scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
    timeSlot,
    pickupAddress,
    notes,
    status: initialStatus
  };

  let pickup;
  if (existing) {
    if (!existing.partner.equals(partner._id) && existing.status !== 'requested') {
      return res.status(409).json({
        success: false,
        message: 'An active pickup request already exists for this textile'
      });
    }
    if (existing.status === 'collected') {
      return res.status(409).json({
        success: false,
        message: 'An active pickup request already exists for this textile'
      });
    }
    Object.assign(existing, payload);
    pickup = await existing.save();
  } else {
    pickup = await PickupRequest.create(payload);
  }

  const wasUnassigned = textile.status !== 'requested' || !textile.matchedPartner;
  textile.status = 'requested';
  textile.matchedPartner = partner._id;
  textile.selectedPathway = pathway;
  await textile.save();

  if (wasUnassigned && textile.estimatedWeightKg > 0) {
    await Partner.findByIdAndUpdate(partner._id, {
      $inc: { currentLoadKg: textile.estimatedWeightKg }
    });
  }

  const eventNote = initialStatus === 'scheduled'
    ? `Scheduled ${transferType} on ${new Date(scheduledDate).toLocaleDateString()} with partner "${partner.name}".`
    : `Handover request submitted to partner "${partner.name}" for "${pathway}".`;

  await addEvent(
    textile._id,
    initialStatus === 'scheduled' ? 'pickup_scheduled' : 'match_requested',
    req.user._id,
    eventNote
  );

  if (partner.user) {
    await notifyUser(partner.user, {
      type: 'pickup_requested',
      title: 'New handover request',
      message: `${textile.refId} was requested for ${pathway}.`,
      link: '/partner',
      relatedTextile: textile._id,
      relatedPickup: pickup._id
    });
  }

  const populated = await PickupRequest.findById(pickup._id)
    .populate('partner', 'name location email phone')
    .populate('textile', 'itemType material condition refId estimatedWeightKg');

  return res.status(201).json({ success: true, data: { pickup: populated } });
}

export async function getMyPickups(req, res) {
  const pickups = await PickupRequest.find({ owner: req.user._id })
    .populate('partner', 'name location email phone')
    .populate('textile', 'itemType material condition status refId photos estimatedWeightKg')
    .sort({ createdAt: -1 });

  return res.json({ success: true, data: { pickups, count: pickups.length } });
}

export async function getPartnerPickups(req, res) {
  const filter = {};

  if (req.user.role !== 'admin') {
    const partnerOrg = await findPartnerOrgForUser(req.user);
    if (!partnerOrg) {
      return res.status(403).json({ success: false, message: 'No registered partner organization found for this account' });
    }
    filter.partner = partnerOrg._id;
  } else if (req.query.partnerId) {
    filter.partner = req.query.partnerId;
  }

  if (req.query.status) filter.status = req.query.status;

  const pickups = await PickupRequest.find(filter)
    .populate('partner', 'name location email phone')
    .populate('owner', 'name email')
    .populate('textile', 'itemType material condition status refId quantity quantityUnit estimatedWeightKg photos')
    .sort({ createdAt: -1 });

  return res.json({ success: true, data: { pickups, count: pickups.length } });
}

export async function getPickupById(req, res) {
  const pickup = await PickupRequest.findById(req.params.id)
    .populate('partner', 'name location email phone supportedPathways')
    .populate('owner', 'name email')
    .populate('textile');

  if (!pickup) {
    return res.status(404).json({ success: false, message: 'Pickup request not found' });
  }

  const hasAccess = await authorizePickupAccess(req, pickup);
  if (!hasAccess) {
    return res.status(403).json({ success: false, message: 'You do not have access to this pickup request' });
  }

  return res.json({ success: true, data: { pickup } });
}

export async function schedulePickup(req, res) {
  const pickup = await PickupRequest.findById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ success: false, message: 'Pickup request not found' });
  }

  const hasAccess = await authorizePickupAccess(req, pickup);
  if (!hasAccess) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions to update schedule' });
  }

  const transitionCheck = validateStatusTransition(pickup.status, 'scheduled');
  if (!transitionCheck.valid) {
    return res.status(400).json({ success: false, message: transitionCheck.error });
  }

  const { scheduledDate, timeSlot, transferType, pickupAddress, notes } = req.body;
  const dateCheck = validateScheduledDate(scheduledDate || pickup.scheduledDate);
  if (!dateCheck.valid) {
    return res.status(400).json({ success: false, message: dateCheck.error });
  }

  if (scheduledDate) pickup.scheduledDate = new Date(scheduledDate);
  if (timeSlot !== undefined) pickup.timeSlot = timeSlot;
  if (transferType !== undefined) pickup.transferType = transferType;
  if (pickupAddress !== undefined) pickup.pickupAddress = { ...pickup.pickupAddress?.toObject?.() || pickup.pickupAddress, ...pickupAddress };
  if (notes !== undefined) pickup.notes = notes;

  pickup.status = 'scheduled';
  await pickup.save();

  await addEvent(
    pickup.textile,
    'pickup_scheduled',
    req.user._id,
    `Collection scheduled for ${pickup.scheduledDate ? pickup.scheduledDate.toLocaleDateString() : 'agreed date'} (${pickup.timeSlot || 'flexible time'}). Textile lifecycle remains requested until collection.`
  );

  await notifyUser(pickup.owner, {
    type: 'pickup_scheduled',
    title: 'Pickup scheduled',
    message: `Collection is scheduled for ${pickup.scheduledDate.toLocaleDateString()}${pickup.timeSlot ? ` (${pickup.timeSlot})` : ''}.`,
    link: `/textiles/${pickup.textile}`,
    relatedTextile: pickup.textile,
    relatedPickup: pickup._id
  });

  const populated = await PickupRequest.findById(pickup._id)
    .populate('partner', 'name location email phone')
    .populate('textile');

  return res.json({ success: true, data: { pickup: populated } });
}

export async function confirmCollection(req, res) {
  const pickup = await PickupRequest.findById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ success: false, message: 'Pickup request not found' });
  }

  const isPartner = await authorizePickupAccess(req, pickup, { partnerOnly: true });
  if (!isPartner) {
    return res.status(403).json({ success: false, message: 'Only the assigned partner can confirm collection' });
  }

  const transitionCheck = validateStatusTransition(pickup.status, 'collected');
  if (!transitionCheck.valid) {
    return res.status(400).json({ success: false, message: transitionCheck.error });
  }

  const updated = await PickupRequest.findOneAndUpdate(
    { _id: pickup._id, status: pickup.status },
    { $set: { status: 'collected', collectedAt: new Date() } },
    { new: true }
  );
  if (!updated) {
    return res.status(409).json({ success: false, message: 'Collection could not be confirmed because the request changed' });
  }

  await Textile.findByIdAndUpdate(pickup.textile, { status: 'collected' });

  const partnerOrg = await Partner.findById(pickup.partner);
  await addEvent(
    pickup.textile,
    'collected',
    req.user._id,
    `Textile physically collected by partner "${partnerOrg?.name || 'Assigned Partner'}".`
  );

  await notifyUser(pickup.owner, {
    type: 'collected',
    title: 'Textile collected',
    message: `${partnerOrg?.name || 'Your partner'} confirmed collection.`,
    link: `/textiles/${pickup.textile}`,
    relatedTextile: pickup.textile,
    relatedPickup: pickup._id
  });

  const populated = await PickupRequest.findById(updated._id)
    .populate('partner', 'name location email phone')
    .populate('textile');

  return res.json({ success: true, data: { pickup: populated }, message: 'Collection confirmed successfully' });
}

export async function confirmOutcome(req, res) {
  const pickup = await PickupRequest.findById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ success: false, message: 'Pickup request not found' });
  }

  const isPartner = await authorizePickupAccess(req, pickup, { partnerOnly: true });
  if (!isPartner) {
    return res.status(403).json({ success: false, message: 'Only the assigned partner can confirm final outcome' });
  }

  const transitionCheck = validateStatusTransition(pickup.status, 'confirmed');
  if (!transitionCheck.valid) {
    return res.status(400).json({ success: false, message: transitionCheck.error });
  }

  const {
    actualWeightKg,
    verifiedMaterial,
    actualCondition,
    finalPathway,
    processingNotes,
    proofImageUrl
  } = req.body;

  const validDetails = validateInspectionDetails(req.body);
  if (!validDetails.valid) {
    return res.status(400).json({ success: false, message: validDetails.error });
  }

  const outcomePathway = finalPathway || pickup.pathway;
  const now = new Date();

  const updated = await PickupRequest.findOneAndUpdate(
    { _id: pickup._id, status: 'collected' },
    {
      $set: {
        status: 'confirmed',
        inspectedAt: now,
        inspection: {
          actualWeightKg: Number(actualWeightKg),
          verifiedMaterial,
          actualCondition,
          finalPathway: outcomePathway,
          processingNotes,
          proofImageUrl,
          outcomeDate: now
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    return res.status(409).json({ success: false, message: 'Outcome was already recorded for this handover' });
  }

  await Textile.findByIdAndUpdate(pickup.textile, {
    $set: { status: 'confirmed', selectedPathway: outcomePathway }
  });

  const partnerOrg = await Partner.findById(pickup.partner);
  const noteDetails = [
    `Final pathway: "${outcomePathway}".`,
    `Verified weight: ${actualWeightKg} kg.`,
    verifiedMaterial ? `Material: ${verifiedMaterial}.` : null,
    processingNotes ? `Notes: ${processingNotes}` : null
  ].filter(Boolean).join(' ');

  await addEvent(
    pickup.textile,
    'outcome_confirmed',
    req.user._id,
    `Partner "${partnerOrg?.name || 'Partner'}" confirmed outcome. ${noteDetails}`
  );

  await notifyUser(pickup.owner, {
    type: 'outcome_confirmed',
    title: 'Outcome confirmed',
    message: `Recovery pathway recorded as ${outcomePathway} (${actualWeightKg} kg).`,
    link: `/textiles/${pickup.textile}`,
    relatedTextile: pickup.textile,
    relatedPickup: pickup._id
  });

  const populated = await PickupRequest.findById(updated._id)
    .populate('partner', 'name location email phone')
    .populate('textile');

  return res.json({ success: true, data: { pickup: populated }, message: 'Final outcome confirmed successfully' });
}

export async function rejectPickup(req, res) {
  const pickup = await PickupRequest.findById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ success: false, message: 'Pickup request not found' });
  }

  const isPartner = await authorizePickupAccess(req, pickup, { partnerOnly: true });
  if (!isPartner) {
    return res.status(403).json({ success: false, message: 'Only the assigned partner can record rejection' });
  }

  const transitionCheck = validateStatusTransition(pickup.status, 'rejected');
  if (!transitionCheck.valid) {
    return res.status(400).json({ success: false, message: transitionCheck.error });
  }

  const { rejectionReason, processingNotes, rejectionKind = 'handover' } = req.body;
  const validRejection = validateRejectionDetails(req.body);
  if (!validRejection.valid) {
    return res.status(400).json({ success: false, message: validRejection.error });
  }

  const kind = rejectionKind === 'processing_unsuccessful' ? 'processing_unsuccessful' : 'handover';
  const now = new Date();

  const updated = await PickupRequest.findOneAndUpdate(
    { _id: pickup._id, status: 'collected' },
    {
      $set: {
        status: 'rejected',
        inspectedAt: now,
        inspection: {
          ...pickup.inspection?.toObject?.() || {},
          rejectionReason,
          rejectionKind: kind,
          processingNotes,
          outcomeDate: now
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    return res.status(409).json({ success: false, message: 'Outcome was already recorded for this handover' });
  }

  await Textile.findByIdAndUpdate(pickup.textile, { status: 'rejected' });
  await releasePartnerLoad(pickup);

  const partnerOrg = await Partner.findById(pickup.partner);
  const eventType = kind === 'processing_unsuccessful' ? 'processing_unsuccessful' : 'inspection_rejected';
  await addEvent(
    pickup.textile,
    eventType,
    req.user._id,
    `Partner "${partnerOrg?.name || 'Partner'}" recorded ${kind.replace('_', ' ')}. Reason: ${rejectionReason}.`
  );

  await notifyUser(pickup.owner, {
    type: 'outcome_rejected',
    title: 'Handover rejected',
    message: rejectionReason,
    link: `/textiles/${pickup.textile}`,
    relatedTextile: pickup.textile,
    relatedPickup: pickup._id
  });

  const populated = await PickupRequest.findById(updated._id)
    .populate('partner', 'name location email phone')
    .populate('textile');

  return res.json({ success: true, data: { pickup: populated }, message: 'Handover marked as rejected' });
}

export async function cancelPickup(req, res) {
  const pickup = await PickupRequest.findById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ success: false, message: 'Pickup request not found' });
  }

  const isOwner = pickup.owner.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';
  const partnerOrg = req.user.role === 'partner' ? await findPartnerOrgForUser(req.user) : null;
  const isAssignedPartner = Boolean(partnerOrg && pickup.partner.equals(partnerOrg._id));

  if (!isOwner && !isAdmin && !isAssignedPartner) {
    return res.status(403).json({ success: false, message: 'Only the owner, assigned partner, or admin can cancel this request' });
  }

  const transitionCheck = validateStatusTransition(pickup.status, 'cancelled');
  if (!transitionCheck.valid) {
    return res.status(400).json({ success: false, message: transitionCheck.error });
  }

  const updated = await PickupRequest.findOneAndUpdate(
    { _id: pickup._id, status: { $in: ['requested', 'scheduled'] } },
    { $set: { status: 'cancelled' } },
    { new: true }
  );
  if (!updated) {
    return res.status(409).json({ success: false, message: 'This pickup can no longer be cancelled' });
  }

  await Textile.findByIdAndUpdate(pickup.textile, { status: 'recommended', matchedPartner: null });
  await releasePartnerLoad(pickup);

  const actor = isAssignedPartner ? 'partner' : 'owner';
  await addEvent(
    pickup.textile,
    'cancelled',
    req.user._id,
    `Pickup request was cancelled by the ${actor}. Textile returned to recommended status.`
  );

  const notifyTarget = isAssignedPartner ? pickup.owner : partnerOrg?.user;
  if (notifyTarget) {
    await notifyUser(notifyTarget, {
      type: 'pickup_cancelled',
      title: 'Pickup cancelled',
      message: `A scheduled handover was cancelled by the ${actor}.`,
      link: isAssignedPartner ? `/textiles/${pickup.textile}` : '/partner',
      relatedTextile: pickup.textile,
      relatedPickup: pickup._id
    });
  }

  const populated = await PickupRequest.findById(updated._id)
    .populate('partner', 'name location email phone')
    .populate('textile');

  return res.json({ success: true, data: { pickup: populated }, message: 'Pickup request cancelled' });
}
