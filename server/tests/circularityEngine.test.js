/**
 * Unit tests for services/circularityEngine.js
 * Run with: npm test
 *
 * These tests are pure — no database, no network.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recommendPathways } from '../src/services/circularityEngine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function byPathway(results, name) {
  return results.find((r) => r.pathway === name);
}

function assertConfidence(result, pathway, expected) {
  const entry = byPathway(result, pathway);
  assert.ok(entry, `Expected pathway "${pathway}" to be present`);
  assert.equal(
    entry.confidence,
    expected,
    `Expected "${pathway}" confidence to be "${expected}", got "${entry.confidence}"`
  );
}

function assertHasReason(result, pathway) {
  const entry = byPathway(result, pathway);
  assert.ok(entry, `Expected pathway "${pathway}" to be present`);
  assert.ok(entry.reason && entry.reason.trim().length > 0, `Expected "${pathway}" to have a non-empty reason`);
}

function assertSortedBestFirst(results) {
  const order = { high: 0, medium: 1, low: 2 };
  for (let i = 1; i < results.length; i++) {
    assert.ok(
      order[results[i - 1].confidence] <= order[results[i].confidence],
      `Pathways not sorted best-first at index ${i}: ${results[i - 1].confidence} > ${results[i].confidence}`
    );
  }
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe('recommendPathways — condition: good, material: cotton', () => {
  const result = recommendPathways({ condition: 'good', material: 'cotton' });

  it('returns reuse, donation, resale pathways', () => {
    assert.ok(byPathway(result, 'reuse'), 'reuse expected');
    assert.ok(byPathway(result, 'donation'), 'donation expected');
    assert.ok(byPathway(result, 'resale'), 'resale expected');
  });

  it('all three are high confidence (cotton, good condition)', () => {
    assertConfidence(result, 'reuse', 'high');
    assertConfidence(result, 'donation', 'high');
    assertConfidence(result, 'resale', 'high');
  });

  it('every pathway has a non-empty reason', () => {
    for (const entry of result) assertHasReason(result, entry.pathway);
  });

  it('results are sorted best-first', () => assertSortedBestFirst(result));
});

// ---------------------------------------------------------------------------

describe('recommendPathways — condition: repairable, material: denim', () => {
  const result = recommendPathways({ condition: 'repairable', material: 'denim' });

  it('returns repair, reuse, upcycling pathways', () => {
    assert.ok(byPathway(result, 'repair'), 'repair expected');
    assert.ok(byPathway(result, 'reuse'), 'reuse expected');
    assert.ok(byPathway(result, 'upcycling'), 'upcycling expected');
  });

  it('upcycling is high confidence (denim + repairable)', () => {
    assertConfidence(result, 'upcycling', 'high');
  });

  it('reason for upcycling mentions denim or high-confidence', () => {
    const entry = byPathway(result, 'upcycling');
    const lower = entry.reason.toLowerCase();
    assert.ok(
      lower.includes('denim') || lower.includes('high'),
      `Expected denim/high in reason: "${entry.reason}"`
    );
  });

  it('results are sorted best-first', () => assertSortedBestFirst(result));
});

// ---------------------------------------------------------------------------

describe('recommendPathways — condition: damaged, material: mixed', () => {
  const result = recommendPathways({ condition: 'damaged', material: 'mixed' });

  it('returns upcycling and recycling pathways', () => {
    assert.ok(byPathway(result, 'upcycling'), 'upcycling expected');
    assert.ok(byPathway(result, 'recycling'), 'recycling expected');
  });

  it('recycling is low confidence for mixed material', () => {
    assertConfidence(result, 'recycling', 'low');
  });

  it('upcycling is medium confidence for mixed material', () => {
    assertConfidence(result, 'upcycling', 'medium');
  });

  it('recycling reason mentions blended fibres or partner confirmation', () => {
    const entry = byPathway(result, 'recycling');
    const lower = entry.reason.toLowerCase();
    assert.ok(
      lower.includes('blend') || lower.includes('partner'),
      `Expected blend/partner in reason: "${entry.reason}"`
    );
  });

  it('results are sorted best-first (upcycling medium before recycling low)', () => {
    assertSortedBestFirst(result);
    const idxUp = result.findIndex((r) => r.pathway === 'upcycling');
    const idxRec = result.findIndex((r) => r.pathway === 'recycling');
    assert.ok(idxUp < idxRec, 'upcycling should appear before recycling');
  });
});

// ---------------------------------------------------------------------------

describe('recommendPathways — condition: unknown', () => {
  const result = recommendPathways({ condition: 'unknown', material: 'cotton' });

  it('returns only manual_assessment', () => {
    assert.equal(result.length, 1, 'Expected exactly one pathway');
    assert.equal(result[0].pathway, 'manual_assessment');
  });

  it('manual_assessment has a non-empty reason', () => {
    assertHasReason(result, 'manual_assessment');
  });
});

// ---------------------------------------------------------------------------

describe('recommendPathways — condition: good, material: unknown', () => {
  const result = recommendPathways({ condition: 'good', material: 'unknown' });

  it('all base pathways (reuse, donation, resale) are still present', () => {
    assert.ok(byPathway(result, 'reuse'), 'reuse expected');
    assert.ok(byPathway(result, 'donation'), 'donation expected');
    assert.ok(byPathway(result, 'resale'), 'resale expected');
  });

  it('no pathway has confidence above medium', () => {
    for (const entry of result) {
      assert.ok(
        entry.confidence !== 'high',
        `Expected confidence capped at medium, got "${entry.confidence}" for "${entry.pathway}"`
      );
    }
  });

  it('every reason mentions material unknown or verify', () => {
    for (const entry of result) {
      const lower = entry.reason.toLowerCase();
      assert.ok(
        lower.includes('unknown') || lower.includes('verify'),
        `Expected unknown/verify in reason for "${entry.pathway}": "${entry.reason}"`
      );
    }
  });

  it('results are sorted best-first', () => assertSortedBestFirst(result));
});
