import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPickupToImpact,
  classifyPathway,
  emptyImpact,
  finalizeImpact
} from '../src/services/impactService.js';

describe('impactService — pathway classification', () => {
  it('groups reuse, donation and resale as reused', () => {
    assert.equal(classifyPathway('reuse'), 'reusedKg');
    assert.equal(classifyPathway('donation'), 'reusedKg');
    assert.equal(classifyPathway('resale'), 'reusedKg');
  });

  it('maps repair, upcycling and recycling independently', () => {
    assert.equal(classifyPathway('repair'), 'repairedKg');
    assert.equal(classifyPathway('upcycling'), 'upcycledKg');
    assert.equal(classifyPathway('recycling'), 'recycledKg');
  });
});

describe('impactService — recovery aggregation', () => {
  it('counts confirmed weight in recovered totals and excludes rejected from recovered', () => {
    const impact = emptyImpact();
    applyPickupToImpact(impact, {
      status: 'confirmed',
      pathway: 'upcycling',
      inspection: { actualWeightKg: 25, finalPathway: 'upcycling' }
    }, { estimatedWeightKg: 20 });
    applyPickupToImpact(impact, {
      status: 'rejected',
      pathway: 'recycling',
      inspection: { actualWeightKg: 10, rejectionKind: 'handover' }
    }, { estimatedWeightKg: 10 });
    applyPickupToImpact(impact, {
      status: 'collected',
      pathway: 'reuse',
      inspection: {}
    }, { estimatedWeightKg: 8 });
    finalizeImpact(impact);

    assert.equal(impact.totalCollectedKg, 43);
    assert.equal(impact.upcycledKg, 25);
    assert.equal(impact.totalRecoveredKg, 25);
    assert.equal(impact.rejectedKg, 10);
    assert.equal(impact.awaitingOutcomeKg, 8);
  });

  it('prefers actual received weight over estimated weight', () => {
    const impact = emptyImpact();
    applyPickupToImpact(impact, {
      status: 'confirmed',
      inspection: { actualWeightKg: 3.2, finalPathway: 'reuse' }
    }, { estimatedWeightKg: 10 });
    finalizeImpact(impact);
    assert.equal(impact.reusedKg, 3.2);
  });
});
