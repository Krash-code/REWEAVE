import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recommendPathways } from '../src/services/circularityEngine.js';
import { matchTextileToPartners } from '../src/services/matchingEngine.js';
import { applyPickupToImpact, emptyImpact, finalizeImpact } from '../src/services/impactService.js';
import { validateScheduledDate, validateStatusTransition } from '../src/services/pickupService.js';

describe('REWEAVE end-to-end workflow', () => {
  it('completes a full textile lifecycle from registration to verified recovery', () => {
    const textile = {
      material: 'cotton',
      condition: 'good',
      estimatedWeightKg: 5,
      location: { city: 'Bengaluru', state: 'Karnataka' },
      recommendedPathways: []
    };

    const recommended = recommendPathways(textile);
    assert.ok(recommended.length >= 3);
    assert.equal(recommended[0].pathway, 'reuse');
    assert.ok(['high', 'medium', 'low'].includes(recommended[0].confidence));

    textile.recommendedPathways = recommended;

    const partners = [
      {
        _id: 'partner-1',
        name: 'GreenLoop Recovery',
        email: 'greenloop@example.com',
        phone: '+91 90000 11111',
        description: 'Cotton and textile recovery partner',
        location: { city: 'Bengaluru', state: 'Karnataka' },
        supportedPathways: ['reuse', 'donation', 'resale', 'repair', 'upcycling', 'recycling'],
        acceptedMaterials: ['cotton', 'denim', 'polyester', 'wool', 'silk', 'nylon', 'mixed', 'unknown'],
        acceptedConditions: ['good', 'repairable', 'damaged', 'unknown'],
        capacityKgPerMonth: 100,
        currentLoadKg: 40,
        isActive: true,
        verificationStatus: 'verified'
      },
      {
        _id: 'partner-2',
        name: 'Urban Repair Hub',
        email: 'repair@example.com',
        phone: '+91 90000 22222',
        description: 'Repair-focused partner',
        location: { city: 'Mysuru', state: 'Karnataka' },
        supportedPathways: ['repair', 'upcycling'],
        acceptedMaterials: ['cotton', 'denim'],
        acceptedConditions: ['good', 'repairable'],
        capacityKgPerMonth: 100,
        currentLoadKg: 10,
        isActive: true,
        verificationStatus: 'verified'
      }
    ];

    const matchResult = matchTextileToPartners(textile, partners);
    assert.equal(matchResult.hasAnyMatch, true);
    const reuseMatch = matchResult.pathwayMatches.find((entry) => entry.pathway === 'reuse');
    assert.ok(reuseMatch);
    assert.equal(reuseMatch.status, 'available');
    assert.ok(reuseMatch.partners.length >= 1);

    const selectedPartner = reuseMatch.partners[0];
    const pickup = {
      status: 'requested',
      partner: selectedPartner._id,
      pathway: 'reuse',
      scheduledDate: null,
      inspection: null,
      textile: textile
    };

    assert.equal(validateStatusTransition(pickup.status, 'scheduled').valid, true);
    const tomorrow = new Date(Date.now() + 86400000);
    assert.equal(validateScheduledDate(tomorrow.toISOString()).valid, true);

    pickup.status = 'scheduled';
    pickup.scheduledDate = tomorrow.toISOString();
    assert.equal(validateStatusTransition(pickup.status, 'collected').valid, true);
    pickup.status = 'collected';
    pickup.collectedAt = new Date();
    assert.equal(validateStatusTransition(pickup.status, 'confirmed').valid, true);

    pickup.status = 'confirmed';
    pickup.inspection = {
      actualWeightKg: 4.8,
      finalPathway: 'reuse',
      outcomeDate: new Date()
    };

    const impact = finalizeImpact(emptyImpact());
    impact.totalCollectedKg = 4.8;
    impact.reusedKg = 4.8;
    impact.totalRecoveredKg = 4.8;

    assert.equal(impact.totalCollectedKg, 4.8);
    assert.equal(impact.reusedKg, 4.8);
    assert.equal(impact.totalRecoveredKg, 4.8);

    const impactResult = applyPickupToImpact(emptyImpact(), pickup, textile);
    const finalImpact = finalizeImpact(impactResult);
    assert.equal(finalImpact.totalCollectedKg, 4.8);
    assert.equal(finalImpact.reusedKg, 4.8);
    assert.equal(finalImpact.totalRecoveredKg, 4.8);

    assert.equal(validateStatusTransition('confirmed', 'rejected').valid, false);
  });
});
