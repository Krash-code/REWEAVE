import QRCode from 'qrcode';
import PickupRequest from '../models/PickupRequest.js';
import Textile from '../models/Textile.js';
import TraceabilityEvent from '../models/TraceabilityEvent.js';

function clientOrigin() {
  return process.env.CLIENT_ORIGIN || 'http://localhost:5173';
}

export async function getPublicPassport(req, res) {
  const refId = String(req.params.refId || '').toUpperCase();
  const textile = await Textile.findOne({ refId }).populate('matchedPartner', 'name location');
  if (!textile) {
    return res.status(404).json({ success: false, message: 'Textile passport not found' });
  }

  const [events, pickup] = await Promise.all([
    TraceabilityEvent.find({ textile: textile._id }).sort({ createdAt: 1, _id: 1 }).select('eventType note createdAt'),
    PickupRequest.findOne({ textile: textile._id }).sort({ createdAt: -1 })
  ]);

  return res.json({
    success: true,
    data: {
      passport: {
        refId: textile.refId,
        itemType: textile.itemType,
        material: textile.material,
        condition: textile.condition,
        status: textile.status,
        selectedPathway: textile.selectedPathway,
        recommendedPathways: textile.recommendedPathways,
        estimatedWeightKg: textile.estimatedWeightKg,
        location: { city: textile.location?.city, state: textile.location?.state },
        createdAt: textile.createdAt,
        partner: textile.matchedPartner
          ? { name: textile.matchedPartner.name, city: textile.matchedPartner.location?.city }
          : null,
        collection: pickup
          ? {
            status: pickup.status,
            transferType: pickup.transferType,
            scheduledDate: pickup.scheduledDate,
            collectedAt: pickup.collectedAt,
            actualWeightKg: pickup.inspection?.actualWeightKg,
            finalPathway: pickup.inspection?.finalPathway,
            rejectionKind: pickup.inspection?.rejectionKind || null
          }
          : null,
        history: events
      }
    }
  });
}

export async function getPassportQr(req, res) {
  const refId = String(req.params.refId || '').toUpperCase();
  const textile = await Textile.findOne({ refId }).select('refId');
  if (!textile) {
    return res.status(404).json({ success: false, message: 'Textile passport not found' });
  }

  const url = `${clientOrigin()}/p/${textile.refId}`;
  const png = await QRCode.toBuffer(url, { type: 'png', margin: 1, width: 320 });
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(png);
}
