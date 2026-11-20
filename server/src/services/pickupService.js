/**
 * Pickup logistics rules. PickupRequest.status is separate from Textile.status:
 * a textile can stay `requested` while its pickup is `scheduled`.
 */

export const ALLOWED_TRANSITIONS = {
  requested: ['scheduled', 'cancelled'],
  scheduled: ['collected', 'cancelled', 'scheduled'],
  collected: ['confirmed', 'rejected'],
  confirmed: [],
  rejected: [],
  cancelled: []
};

export const ACTIVE_PICKUP_STATUSES = ['requested', 'scheduled', 'collected'];

export function validateStatusTransition(currentStatus, targetStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      error: `Cannot transition pickup from "${currentStatus}" to "${targetStatus}". Allowed: [${allowed.join(', ') || 'none (terminal state)'}]`
    };
  }
  return { valid: true };
}

export function validateScheduledDate(scheduledDate) {
  if (!scheduledDate) {
    return { valid: false, error: 'Scheduled date is required' };
  }
  const date = scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, error: 'Scheduled date must be a valid date' };
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (date < startOfToday) {
    return { valid: false, error: 'Pickup date cannot be in the past' };
  }
  return { valid: true };
}

export function validateInspectionDetails(details) {
  if (!details || typeof details !== 'object') {
    return { valid: false, error: 'Inspection details object is required' };
  }
  if (details.actualWeightKg == null || details.actualWeightKg === '') {
    return { valid: false, error: 'Actual received weight is required' };
  }
  const weight = Number(details.actualWeightKg);
  if (!Number.isFinite(weight) || weight < 0) {
    return { valid: false, error: 'Actual weight must be a positive number' };
  }
  if (!details.finalPathway || typeof details.finalPathway !== 'string' || !details.finalPathway.trim()) {
    return { valid: false, error: 'Final circular pathway is required' };
  }
  return { valid: true };
}

export function validateRejectionDetails(details) {
  if (!details || !details.rejectionReason || !details.rejectionReason.trim()) {
    return { valid: false, error: 'Rejection reason is required' };
  }
  return { valid: true };
}

export function recoveryWeightKg(pickup, textile) {
  const actual = pickup?.inspection?.actualWeightKg;
  if (actual != null && Number.isFinite(Number(actual))) return Number(actual);
  const estimated = textile?.estimatedWeightKg;
  if (estimated != null && Number.isFinite(Number(estimated))) return Number(estimated);
  return 0;
}
