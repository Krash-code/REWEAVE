import CollectionDrive from '../models/CollectionDrive.js';
import PickupRequest from '../models/PickupRequest.js';
import Textile from '../models/Textile.js';
import { finalizeImpact, applyPickupToImpact, emptyImpact } from '../services/impactService.js';

function canManageDrive(user, drive) {
  return user.role === 'admin' || drive.institution.equals(user._id);
}

export async function createDrive(req, res) {
  if (req.user.role !== 'institution' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only institutions can create collection drives' });
  }

  const { title, description, startDate, endDate, location, targetWeightKg } = req.body;
  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ success: false, message: 'End date must be on or after the start date' });
  }

  const drive = await CollectionDrive.create({
    title,
    institution: req.user.role === 'institution' ? req.user._id : req.body.institutionId || req.user._id,
    description,
    startDate,
    endDate,
    location,
    targetWeightKg: targetWeightKg ?? 0,
    status: 'open',
    participants: [req.user._id]
  });

  return res.status(201).json({ success: true, data: { drive } });
}

export async function listDrives(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const drives = await CollectionDrive.find(filter)
    .populate('institution', 'name email')
    .sort({ startDate: -1 });
  return res.json({ success: true, data: { drives, count: drives.length } });
}

export async function getDrive(req, res) {
  const drive = await CollectionDrive.findById(req.params.id).populate('institution', 'name email');
  if (!drive) {
    return res.status(404).json({ success: false, message: 'Collection drive not found' });
  }
  const textiles = await Textile.find({ collectionDrive: drive._id }).select('refId itemType status estimatedWeightKg owner');
  return res.json({
    success: true,
    data: {
      drive,
      textiles,
      joined: drive.participants.some((id) => id.equals(req.user._id))
    }
  });
}

export async function joinDrive(req, res) {
  const drive = await CollectionDrive.findById(req.params.id);
  if (!drive) {
    return res.status(404).json({ success: false, message: 'Collection drive not found' });
  }
  if (drive.status !== 'open') {
    return res.status(400).json({ success: false, message: 'This collection drive is closed' });
  }

  await CollectionDrive.findByIdAndUpdate(drive._id, {
    $addToSet: { participants: req.user._id }
  });

  const updated = await CollectionDrive.findById(drive._id);
  return res.json({ success: true, data: { drive: updated }, message: 'Joined collection drive' });
}

export async function submitTextileToDrive(req, res) {
  const drive = await CollectionDrive.findById(req.params.id);
  if (!drive) {
    return res.status(404).json({ success: false, message: 'Collection drive not found' });
  }
  if (drive.status !== 'open') {
    return res.status(400).json({ success: false, message: 'This collection drive is closed' });
  }

  const isParticipant = drive.participants.some((id) => id.equals(req.user._id)) || canManageDrive(req.user, drive);
  if (!isParticipant) {
    return res.status(403).json({ success: false, message: 'Join the drive before submitting a textile' });
  }

  const textile = await Textile.findById(req.body.textileId);
  if (!textile) {
    return res.status(404).json({ success: false, message: 'Textile not found' });
  }
  if (!textile.owner.equals(req.user._id) && req.user.role !== 'admin' && !drive.institution.equals(req.user._id)) {
    return res.status(403).json({ success: false, message: 'You can only submit your own textiles' });
  }

  textile.collectionDrive = drive._id;
  await textile.save();
  return res.json({ success: true, data: { textile } });
}

export async function getDriveReport(req, res) {
  const drive = await CollectionDrive.findById(req.params.id).populate('institution', 'name email');
  if (!drive) {
    return res.status(404).json({ success: false, message: 'Collection drive not found' });
  }

  const textiles = await Textile.find({ collectionDrive: drive._id });
  const pickups = await PickupRequest.find({ textile: { $in: textiles.map((item) => item._id) } });
  const textileById = new Map(textiles.map((item) => [String(item._id), item]));

  const impact = emptyImpact();
  impact.totalRegistered = textiles.length;
  for (const pickup of pickups) {
    applyPickupToImpact(impact, pickup, textileById.get(String(pickup.textile)));
  }
  finalizeImpact(impact);

  return res.json({
    success: true,
    data: {
      drive,
      impact,
      note: 'Report uses verified recovery weights only. CO₂ estimates are not included.'
    }
  });
}
