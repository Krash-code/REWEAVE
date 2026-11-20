import Partner from '../models/Partner.js';
import PickupRequest from '../models/PickupRequest.js';
import Textile from '../models/Textile.js';
import User from '../models/User.js';
import CollectionDrive from '../models/CollectionDrive.js';
import { summarizeImpact } from '../services/impactService.js';

export async function getAdminAnalytics(req, res) {
  const [
    totalUsers,
    totalInstitutions,
    verifiedPartners,
    totalTextiles,
    textilesByStatus,
    pickupsByStatus,
    totalDrives,
    impact,
    partnerActivity
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'institution' }),
    Partner.countDocuments({ verificationStatus: 'verified', isActive: true }),
    Textile.countDocuments(),
    Textile.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    PickupRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    CollectionDrive.countDocuments(),
    summarizeImpact(),
    PickupRequest.aggregate([
      { $group: { _id: '$partner', total: { $sum: 1 }, confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } } } },
      { $sort: { total: -1 } },
      { $limit: 12 }
    ])
  ]);

  const partnerIds = partnerActivity.map((row) => row._id);
  const partners = await Partner.find({ _id: { $in: partnerIds } }).select('name location verificationStatus isActive');
  const partnerMap = new Map(partners.map((partner) => [String(partner._id), partner]));

  return res.json({
    success: true,
    data: {
      totals: {
        users: totalUsers,
        institutions: totalInstitutions,
        verifiedPartners,
        textiles: totalTextiles,
        handoverRequests: pickupsByStatus.reduce((sum, row) => sum + row.count, 0),
        drives: totalDrives
      },
      textilesByStatus: Object.fromEntries(textilesByStatus.map((row) => [row._id, row.count])),
      pickupsByStatus: Object.fromEntries(pickupsByStatus.map((row) => [row._id, row.count])),
      impact,
      partnerActivity: partnerActivity.map((row) => ({
        partner: partnerMap.get(String(row._id)),
        total: row.total,
        confirmed: row.confirmed,
        rejected: row.rejected
      }))
    }
  });
}

export async function listUsers(req, res) {
  const users = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(200);
  return res.json({ success: true, data: { users, count: users.length } });
}

export async function suspendPartner(req, res) {
  const partner = await Partner.findById(req.params.id);
  if (!partner) {
    return res.status(404).json({ success: false, message: 'Partner not found' });
  }
  partner.isActive = req.body.isActive === true;
  await partner.save();
  return res.json({
    success: true,
    data: { partner },
    message: partner.isActive ? 'Partner reactivated' : 'Partner suspended'
  });
}
