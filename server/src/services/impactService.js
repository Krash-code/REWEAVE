import PickupRequest from '../models/PickupRequest.js';
import Textile from '../models/Textile.js';
import { recoveryWeightKg } from './pickupService.js';

const REUSE_PATHWAYS = new Set(['reuse', 'donation', 'resale']);

export function emptyImpact() {
  return {
    totalRegistered: 0,
    totalCollectedKg: 0,
    reusedKg: 0,
    repairedKg: 0,
    upcycledKg: 0,
    recycledKg: 0,
    totalRecoveredKg: 0,
    awaitingOutcomeKg: 0,
    rejectedKg: 0
  };
}

export function classifyPathway(pathway) {
  if (!pathway) return null;
  if (REUSE_PATHWAYS.has(pathway)) return 'reusedKg';
  if (pathway === 'repair') return 'repairedKg';
  if (pathway === 'upcycling') return 'upcycledKg';
  if (pathway === 'recycling') return 'recycledKg';
  return null;
}

export function applyPickupToImpact(impact, pickup, textile) {
  const weight = recoveryWeightKg(pickup, textile);
  if (pickup.status === 'collected') {
    impact.totalCollectedKg += weight;
    impact.awaitingOutcomeKg += weight;
  } else if (pickup.status === 'confirmed') {
    impact.totalCollectedKg += weight;
    const bucket = classifyPathway(pickup.inspection?.finalPathway || pickup.pathway);
    if (bucket) impact[bucket] += weight;
  } else if (pickup.status === 'rejected') {
    impact.totalCollectedKg += weight;
    impact.rejectedKg += weight;
  }
  return impact;
}

export function finalizeImpact(impact) {
  impact.totalRecoveredKg =
    impact.reusedKg + impact.repairedKg + impact.upcycledKg + impact.recycledKg;
  return impact;
}

export async function summarizeImpact({ textileFilter = {}, pickupFilter = {} } = {}) {
  const impact = emptyImpact();
  impact.totalRegistered = await Textile.countDocuments(textileFilter);

  const pickupQuery = { ...pickupFilter };
  if (Object.keys(textileFilter).length > 0) {
    pickupQuery.textile = { $in: await Textile.find(textileFilter).distinct('_id') };
  }

  const pickups = await PickupRequest.find(pickupQuery).populate('textile', 'estimatedWeightKg');
  for (const pickup of pickups) {
    applyPickupToImpact(impact, pickup, pickup.textile);
  }

  return finalizeImpact(impact);
}

export async function impactByPathway(filter) {
  const summary = await summarizeImpact(filter);
  return [
    { pathway: 'reuse', kg: summary.reusedKg },
    { pathway: 'repair', kg: summary.repairedKg },
    { pathway: 'upcycling', kg: summary.upcycledKg },
    { pathway: 'recycling', kg: summary.recycledKg }
  ];
}

export async function monthlyImpact(filter) {
  const pickupQuery = {
    ...(filter.pickupFilter || {}),
    status: { $in: ['collected', 'confirmed', 'rejected'] }
  };
  if (filter.textileFilter && Object.keys(filter.textileFilter).length > 0) {
    pickupQuery.textile = { $in: await Textile.find(filter.textileFilter).distinct('_id') };
  }
  const pickups = await PickupRequest.find(pickupQuery).populate('textile', 'estimatedWeightKg');

  const months = new Map();
  for (const pickup of pickups) {
    const when = pickup.inspection?.outcomeDate || pickup.collectedAt || pickup.updatedAt;
    const key = `${when.getUTCFullYear()}-${String(when.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) {
      months.set(key, { month: key, collectedKg: 0, recoveredKg: 0, rejectedKg: 0 });
    }
    const row = months.get(key);
    const weight = recoveryWeightKg(pickup, pickup.textile);
    row.collectedKg += weight;
    if (pickup.status === 'confirmed') row.recoveredKg += weight;
    if (pickup.status === 'rejected') row.rejectedKg += weight;
  }

  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
