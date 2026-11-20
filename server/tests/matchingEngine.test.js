import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkPartnerEligibility, matchTextileToPartners } from '../src/services/matchingEngine.js';

describe('matchingEngine — Partner Eligibility Checks', () => {
  const textile = {
    material: 'cotton',
    condition: 'good',
    estimatedWeightKg: 10,
    location: { city: 'Bengaluru', state: 'Karnataka' },
    recommendedPathways: [{ pathway: 'reuse', confidence: 'high', reason: 'Direct reuse' }]
  };

  it('rejects unverified partners', () => {
    const unverifiedPartner = {
      _id: 'p1',
      name: 'Unverified Org',
      verificationStatus: 'pending',
      isActive: true,
      supportedPathways: ['reuse'],
      acceptedMaterials: ['cotton'],
      acceptedConditions: ['good']
    };
    const res = checkPartnerEligibility(textile, 'reuse', unverifiedPartner);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /not verified/i);
  });

  it('rejects inactive partners', () => {
    const inactivePartner = {
      _id: 'p2',
      name: 'Inactive Org',
      verificationStatus: 'verified',
      isActive: false,
      supportedPathways: ['reuse'],
      acceptedMaterials: ['cotton'],
      acceptedConditions: ['good']
    };
    const res = checkPartnerEligibility(textile, 'reuse', inactivePartner);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /inactive/i);
  });

  it('rejects partners that do not support the given pathway', () => {
    const recyclingPartner = {
      _id: 'p3',
      name: 'Recycle Only',
      verificationStatus: 'verified',
      isActive: true,
      supportedPathways: ['recycling'],
      acceptedMaterials: ['cotton'],
      acceptedConditions: ['good']
    };
    const res = checkPartnerEligibility(textile, 'reuse', recyclingPartner);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /does not support pathway/i);
  });

  it('rejects partners incompatible with material', () => {
    const denimPartner = {
      _id: 'p4',
      name: 'Denim Specialists',
      verificationStatus: 'verified',
      isActive: true,
      supportedPathways: ['reuse'],
      acceptedMaterials: ['denim'],
      acceptedConditions: ['good']
    };
    const res = checkPartnerEligibility(textile, 'reuse', denimPartner);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /does not accept "cotton"/i);
  });

  it('rejects partners incompatible with condition', () => {
    const damagedPartner = {
      _id: 'p5',
      name: 'Damaged Fabric Recycler',
      verificationStatus: 'verified',
      isActive: true,
      supportedPathways: ['reuse'],
      acceptedMaterials: ['cotton'],
      acceptedConditions: ['damaged']
    };
    const res = checkPartnerEligibility(textile, 'reuse', damagedPartner);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /does not accept "good"/i);
  });

  it('rejects partners when capacity is exceeded', () => {
    const fullPartner = {
      _id: 'p6',
      name: 'Full Warehouse',
      verificationStatus: 'verified',
      isActive: true,
      supportedPathways: ['reuse'],
      acceptedMaterials: ['cotton'],
      acceptedConditions: ['good'],
      capacityKgPerMonth: 100,
      currentLoadKg: 95 // 95 + 10 = 105 > 100
    };
    const res = checkPartnerEligibility(textile, 'reuse', fullPartner);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /capacity exceeded/i);
  });

  it('accepts eligible verified partner and flags isLocal when cities match', () => {
    const localPartner = {
      _id: 'p7',
      name: 'Bengaluru Reuse Hub',
      verificationStatus: 'verified',
      isActive: true,
      supportedPathways: ['reuse'],
      acceptedMaterials: ['cotton'],
      acceptedConditions: ['good'],
      capacityKgPerMonth: 500,
      currentLoadKg: 50,
      location: { city: 'Bengaluru', state: 'Karnataka' }
    };
    const res = checkPartnerEligibility(textile, 'reuse', localPartner);
    assert.equal(res.eligible, true);
    assert.equal(res.isLocal, true);
    assert.equal(res.isSameState, true);
  });
});

describe('matchingEngine — matchTextileToPartners', () => {
  const textile = {
    material: 'denim',
    condition: 'repairable',
    estimatedWeightKg: 5,
    location: { city: 'Mumbai', state: 'Maharashtra' },
    recommendedPathways: [
      { pathway: 'repair', confidence: 'high', reason: 'Repair suggested' },
      { pathway: 'upcycling', confidence: 'high', reason: 'Upcycling suggested' },
      { pathway: 'reuse', confidence: 'medium', reason: 'Reuse suggested' }
    ]
  };

  const partner1 = {
    _id: 'm1',
    name: 'Mumbai Denim Crafters',
    verificationStatus: 'verified',
    isActive: true,
    supportedPathways: ['repair', 'upcycling'],
    acceptedMaterials: ['denim'],
    acceptedConditions: ['repairable', 'damaged'],
    location: { city: 'Mumbai', state: 'Maharashtra' }
  };

  const partner2 = {
    _id: 'm2',
    name: 'Pune Eco Repair',
    verificationStatus: 'verified',
    isActive: true,
    supportedPathways: ['repair'],
    acceptedMaterials: ['denim', 'cotton'],
    acceptedConditions: ['repairable'],
    location: { city: 'Pune', state: 'Maharashtra' }
  };

  it('matches verified partners to relevant pathways and flags missing pathways as awaiting_match', () => {
    const result = matchTextileToPartners(textile, [partner1, partner2]);

    assert.equal(result.hasAnyMatch, true);
    assert.equal(result.pathwayMatches.length, 3);

    // repair should have both partner1 and partner2
    const repairMatch = result.pathwayMatches.find((p) => p.pathway === 'repair');
    assert.equal(repairMatch.status, 'available');
    assert.equal(repairMatch.partners.length, 2);
    // local partner (Mumbai) must be sorted first
    assert.equal(repairMatch.partners[0].name, 'Mumbai Denim Crafters');
    assert.equal(repairMatch.partners[0].isLocal, true);

    // upcycling should have partner1
    const upcyclingMatch = result.pathwayMatches.find((p) => p.pathway === 'upcycling');
    assert.equal(upcyclingMatch.status, 'available');
    assert.equal(upcyclingMatch.partners.length, 1);

    // reuse should have NO partners -> awaiting_match
    const reuseMatch = result.pathwayMatches.find((p) => p.pathway === 'reuse');
    assert.equal(reuseMatch.status, 'awaiting_match');
    assert.equal(reuseMatch.partners.length, 0);
    assert.match(reuseMatch.statusMessage, /awaiting match/i);
  });

  it('flags all pathways as awaiting_match when no verified partners exist', () => {
    const result = matchTextileToPartners(textile, []);
    assert.equal(result.hasAnyMatch, false);
    for (const match of result.pathwayMatches) {
      assert.equal(match.status, 'awaiting_match');
      assert.equal(match.partners.length, 0);
    }
  });
});
