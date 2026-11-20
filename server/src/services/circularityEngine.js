/**
 * Circularity Engine — PURE function, no database access.
 *
 * recommendPathways(textile) → [{ pathway, confidence, reason }]
 *
 * Confidence levels: "high" | "medium" | "low"
 *
 * Design rules:
 *  1. Condition sets the base pathway list.
 *  2. Material adjustments change confidence/reason; they NEVER remove a pathway.
 *  3. Every pathway carries a plain-language reason so the UI can show logic.
 *  4. Pathways are ordered best-first (high → medium → low confidence).
 *  5. No claim that a pathway is guaranteed; wording says "suggested".
 *  6. Partner availability is NOT checked here (Step 4).
 */

// ---------------------------------------------------------------------------
// CONFIG OBJECT — edit rules here without touching logic below
// ---------------------------------------------------------------------------
const RULES = {
  // Base confidence assigned to each pathway when condition sets it
  baseConfidence: {
    // condition: { pathway: confidence }
    good:        { reuse: 'high', donation: 'high', resale: 'high' },
    repairable:  { repair: 'high', reuse: 'medium', upcycling: 'medium' },
    damaged:     { upcycling: 'medium', recycling: 'medium' },
    unknown:     { manual_assessment: 'high' }
  },

  // Base reason for each pathway (used as a starting point; material rules may append)
  baseReason: {
    reuse:             'Item is in good condition and suggested for direct reuse.',
    donation:          'Item is in good condition and suggested for donation to a charity or community group.',
    resale:            'Item is in good condition and suggested for resale.',
    repair:            'Item needs minor repair before it can be reused; repair is suggested first.',
    upcycling:         'Item can be creatively transformed into a new product.',
    recycling:         'Item is suggested for material recycling.',
    manual_assessment: 'Condition is unknown; a manual assessment is suggested before any pathway is chosen.'
  },

  // Material-specific adjustments — each entry can override confidence and append to reason
  materialAdjustments: {
    // mixed / blended fabrics are harder to recycle
    mixed: {
      recycling:  { confidence: 'low',    reason: 'Blended fibres are harder to recycle; a partner must confirm.' },
      upcycling:  { confidence: 'medium', reason: 'Upcycling blended fabrics is possible but may require specialist handling.' }
    },

    // cotton and denim respond well to upcycling when not in good condition
    cotton: {
      upcycling: {
        conditions: ['repairable', 'damaged'],
        confidence: 'high',
        reason: 'Cotton upcycles very well — high-confidence pathway for repairable or damaged items.'
      }
    },
    denim: {
      upcycling: {
        conditions: ['repairable', 'damaged'],
        confidence: 'high',
        reason: 'Denim is in strong demand for upcycling — high-confidence pathway for repairable or damaged items.'
      }
    },

    // wool and silk command premium resale/reuse when in good condition
    wool: {
      resale: {
        conditions: ['good'],
        confidence: 'high',
        reason: 'Wool in good condition has high resale value — high-confidence pathway.'
      },
      reuse: {
        conditions: ['good'],
        confidence: 'high',
        reason: 'Wool in good condition is well-suited to direct reuse — high-confidence pathway.'
      }
    },
    silk: {
      resale: {
        conditions: ['good'],
        confidence: 'high',
        reason: 'Silk in good condition commands strong resale demand — high-confidence pathway.'
      },
      reuse: {
        conditions: ['good'],
        confidence: 'high',
        reason: 'Silk in good condition is well-suited to direct reuse — high-confidence pathway.'
      }
    }
  },

  // Unknown material: cap all confidences at medium and add a note
  unknownMaterialNote: 'Material is unknown; verify on receipt before committing to a pathway.',
  unknownMaterialConfidenceCap: 'medium', // 'high' → 'medium'; 'medium' and 'low' unchanged

  // Sort order for output: best pathways first
  confidenceOrder: { high: 0, medium: 1, low: 2 }
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Returns a copy of a pathway entry with a possibly-appended reason. */
function applyAdjustment(entry, adjustment) {
  const result = { ...entry };

  // Only apply if no condition restriction, or condition matches
  if (adjustment.conditions && !adjustment.conditions.includes(entry._condition)) {
    return result;
  }

  result.confidence = adjustment.confidence;
  if (adjustment.reason) {
    result.reason = `${result.reason} ${adjustment.reason}`;
  }
  return result;
}

// ---------------------------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------------------------

/**
 * Recommends circularity pathways for a textile.
 *
 * @param {{ condition: string, material: string }} textile
 * @returns {{ pathway: string, confidence: 'high'|'medium'|'low', reason: string }[]}
 */
export function recommendPathways(textile) {
  const { condition, material } = textile;

  // 1. Build base pathways from condition
  const baseMap = RULES.baseConfidence[condition] ?? RULES.baseConfidence.unknown;
  const reasonMap = RULES.baseReason;

  let entries = Object.entries(baseMap).map(([pathway, confidence]) => ({
    pathway,
    confidence,
    reason: reasonMap[pathway] || '',
    _condition: condition // internal; stripped before return
  }));

  // 2. Apply material-specific adjustments
  const matAdj = RULES.materialAdjustments[material];
  if (matAdj) {
    entries = entries.map((entry) => {
      const adj = matAdj[entry.pathway];
      if (!adj) return entry;
      return applyAdjustment(entry, adj);
    });
  }

  // 3. Cap confidence for unknown material
  if (material === 'unknown') {
    const cap = RULES.unknownMaterialConfidenceCap;
    const order = RULES.confidenceOrder;
    entries = entries.map((entry) => {
      const capped =
        order[entry.confidence] < order[cap] ? cap : entry.confidence;
      const note = RULES.unknownMaterialNote;
      const alreadyHasNote = entry.reason.includes(note);
      return {
        ...entry,
        confidence: capped,
        reason: alreadyHasNote ? entry.reason : `${entry.reason} ${note}`
      };
    });
  }

  // 4. Strip internal field, sort best-first
  return entries
    .map(({ _condition: _c, ...rest }) => rest) // eslint-disable-line no-unused-vars
    .sort(
      (a, b) =>
        RULES.confidenceOrder[a.confidence] - RULES.confidenceOrder[b.confidence]
    );
}
