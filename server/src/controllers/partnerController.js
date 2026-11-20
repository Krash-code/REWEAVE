import Partner from '../models/Partner.js';

export async function createPartner(req, res) {
  const {
    name,
    email,
    phone,
    description,
    location,
    supportedPathways,
    acceptedMaterials,
    acceptedConditions,
    capacityKgPerMonth
  } = req.body;

  // Auto-verify if created directly by admin, otherwise default to pending
  const isAdmin = req.user.role === 'admin';
  const verificationStatus = isAdmin ? (req.body.verificationStatus || 'verified') : 'pending';

  const partner = await Partner.create({
    name,
    user: req.user.role === 'partner' ? req.user._id : req.body.userId,
    email,
    phone,
    description,
    location,
    supportedPathways,
    acceptedMaterials,
    acceptedConditions,
    capacityKgPerMonth: capacityKgPerMonth ?? 1000,
    verificationStatus,
    verifiedBy: verificationStatus === 'verified' ? req.user._id : undefined,
    verifiedAt: verificationStatus === 'verified' ? new Date() : undefined,
    isActive: true
  });

  return res.status(201).json({ success: true, data: { partner } });
}

export async function listPartners(req, res) {
  const filter = {};

  // Non-admins can only see active verified partners
  if (req.user?.role !== 'admin') {
    filter.verificationStatus = 'verified';
    filter.isActive = true;
  } else if (req.query.verificationStatus) {
    filter.verificationStatus = req.query.verificationStatus;
  }

  if (req.query.pathway) {
    filter.supportedPathways = req.query.pathway;
  }
  if (req.query.city) {
    filter['location.city'] = new RegExp(`^${req.query.city.trim()}$`, 'i');
  }

  const partners = await Partner.find(filter)
    .populate('verifiedBy', 'name email')
    .sort({ createdAt: -1 });

  return res.json({ success: true, data: { partners, count: partners.length } });
}

export async function getPartner(req, res) {
  const partner = await Partner.findById(req.params.id).populate('verifiedBy', 'name email');
  if (!partner) {
    return res.status(404).json({ success: false, message: 'Partner not found' });
  }

  // Non-admins can only see verified partners unless it is their own profile
  const isOwner = partner.user && partner.user.equals(req.user._id);
  if (req.user.role !== 'admin' && !isOwner && partner.verificationStatus !== 'verified') {
    return res.status(403).json({ success: false, message: 'Partner is not yet verified' });
  }

  return res.json({ success: true, data: { partner } });
}

export async function updatePartner(req, res) {
  const partner = await Partner.findById(req.params.id);
  if (!partner) {
    return res.status(404).json({ success: false, message: 'Partner not found' });
  }

  const isOwner = partner.user && partner.user.equals(req.user._id);
  if (req.user.role !== 'admin' && !isOwner) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions to update this partner' });
  }

  const allowedUpdates = [
    'name',
    'phone',
    'description',
    'location',
    'supportedPathways',
    'acceptedMaterials',
    'acceptedConditions',
    'capacityKgPerMonth',
    'isActive'
  ];

  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      partner[field] = req.body[field];
    }
  }

  await partner.save();
  return res.json({ success: true, data: { partner } });
}

/**
 * PATCH /api/partners/:id/verify (Admin Only)
 */
export async function verifyPartner(req, res) {
  const { status, verificationNotes = '' } = req.body;
  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be either "verified" or "rejected"'
    });
  }

  const partner = await Partner.findById(req.params.id);
  if (!partner) {
    return res.status(404).json({ success: false, message: 'Partner not found' });
  }

  partner.verificationStatus = status;
  partner.verifiedBy = req.user._id;
  partner.verifiedAt = new Date();
  partner.verificationNotes = verificationNotes;

  await partner.save();

  if (status === 'verified' && partner.user) {
    const { notifyUser } = await import('../services/notificationService.js');
    await notifyUser(partner.user, {
      type: 'partner_approved',
      title: 'Partner approved',
      message: `${partner.name} is now a verified REWEAVE partner.`,
      link: '/partner'
    });
  }

  return res.json({
    success: true,
    data: { partner },
    message: `Partner has been ${status}`
  });
}
