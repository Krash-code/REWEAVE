import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateInspectionDetails,
  validateRejectionDetails,
  validateScheduledDate,
  validateStatusTransition
} from '../src/services/pickupService.js';

describe('pickupService — Status Transition Rules', () => {
  it('allows valid transition from requested to scheduled', () => {
    const res = validateStatusTransition('requested', 'scheduled');
    assert.equal(res.valid, true);
  });

  it('allows valid transition from scheduled to collected', () => {
    const res = validateStatusTransition('scheduled', 'collected');
    assert.equal(res.valid, true);
  });

  it('allows valid transition from collected to confirmed', () => {
    const res = validateStatusTransition('collected', 'confirmed');
    assert.equal(res.valid, true);
  });

  it('allows valid transition from collected to rejected', () => {
    const res = validateStatusTransition('collected', 'rejected');
    assert.equal(res.valid, true);
  });

  it('allows owner cancellation from requested or scheduled', () => {
    assert.equal(validateStatusTransition('requested', 'cancelled').valid, true);
    assert.equal(validateStatusTransition('scheduled', 'cancelled').valid, true);
  });

  it('requires scheduling before collection', () => {
    const res = validateStatusTransition('requested', 'collected');
    assert.equal(res.valid, false);
  });

  it('blocks skipping collection directly from requested to confirmed', () => {
    const res = validateStatusTransition('requested', 'confirmed');
    assert.equal(res.valid, false);
    assert.match(res.error, /cannot transition/i);
  });

  it('blocks confirm without collection', () => {
    assert.equal(validateStatusTransition('scheduled', 'confirmed').valid, false);
  });

  it('blocks transition from confirmed terminal state', () => {
    const res = validateStatusTransition('confirmed', 'rejected');
    assert.equal(res.valid, false);
    assert.match(res.error, /cannot transition/i);
  });

  it('blocks transition from rejected terminal state', () => {
    const res = validateStatusTransition('rejected', 'confirmed');
    assert.equal(res.valid, false);
  });

  it('blocks backward transition from collected back to scheduled', () => {
    const res = validateStatusTransition('collected', 'scheduled');
    assert.equal(res.valid, false);
  });
});

describe('pickupService — Inspection and Rejection Payload Validation', () => {
  it('validates proper inspection payload', () => {
    const payload = {
      actualWeightKg: 4.5,
      verifiedMaterial: 'cotton',
      actualCondition: 'good',
      finalPathway: 'reuse',
      processingNotes: 'Clean and sorted'
    };
    const res = validateInspectionDetails(payload);
    assert.equal(res.valid, true);
  });

  it('rejects missing final pathway', () => {
    const res = validateInspectionDetails({ actualWeightKg: 2 });
    assert.equal(res.valid, false);
  });

  it('rejects negative weight', () => {
    const payload = { actualWeightKg: -1.5, finalPathway: 'recycling' };
    const res = validateInspectionDetails(payload);
    assert.equal(res.valid, false);
    assert.match(res.error, /positive number/i);
  });

  it('validates proper rejection payload', () => {
    const payload = { rejectionReason: 'Severe biological contamination' };
    const res = validateRejectionDetails(payload);
    assert.equal(res.valid, true);
  });

  it('rejects empty rejection reason', () => {
    const payload = { rejectionReason: '   ' };
    const res = validateRejectionDetails(payload);
    assert.equal(res.valid, false);
    assert.match(res.error, /rejection reason is required/i);
  });
});

describe('pickupService — Schedule date validation', () => {
  it('rejects dates in the past', () => {
    const res = validateScheduledDate('2020-01-01');
    assert.equal(res.valid, false);
    assert.match(res.error, /past/i);
  });

  it('accepts today or a future date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    assert.equal(validateScheduledDate(tomorrow.toISOString()).valid, true);
  });
});
