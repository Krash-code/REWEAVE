/**
 * Pure Matching Engine — No database access inside.
 * Matches a textile and its recommended pathways to verified, capable partners.
 *
 * Rules:
 *  1. Only VERIFIED and ACTIVE partners are matched. Unverified/pending/rejected partners are ignored.
 *  2. Partner must accept the textile's material and condition.
 *  3. Partner must support the specific pathway.
 *  4. Partner must have sufficient capacity if capacityKgPerMonth is specified.
 *  5. Local partners (same city) are prioritized and badged.
 *  6. Pathways with no eligible partner are flagged as "awaiting_match" (never silently dropped).
 */

/**
 * Checks whether a single partner can accept the textile for a specific pathway.
 *
 * @param {{ material: string, condition: string, estimatedWeightKg?: number, location?: { city?: string, state?: string } }} textile
 * @param {string} pathway
 * @param {object} partner
 * @returns {{ eligible: boolean, reason?: string, isLocal: boolean, isSameState: boolean }}
 */
export function checkPartnerEligibility(textile, pathway, partner) {
  // 1. Must be active and verified
  if (partner.isActive === false) {
    return { eligible: false, reason: 'Partner is inactive', isLocal: false, isSameState: false };
  }
  if (partner.verificationStatus !== 'verified') {
    return { eligible: false, reason: 'Partner is not verified by admin', isLocal: false, isSameState: false };
  }

  // 2. Must support the pathway
  const pathways = partner.supportedPathways || [];
  if (!pathways.includes(pathway)) {
    return { eligible: false, reason: `Partner does not support pathway "${pathway}"`, isLocal: false, isSameState: false };
  }

  // 3. Must accept the material
  const materials = partner.acceptedMaterials || [];
  if (materials.length > 0 && !materials.includes(textile.material) && !materials.includes('all')) {
    return { eligible: false, reason: `Partner does not accept "${textile.material}" material`, isLocal: false, isSameState: false };
  }

  // 4. Must accept the condition
  const conditions = partner.acceptedConditions || [];
  if (conditions.length > 0 && !conditions.includes(textile.condition) && !conditions.includes('all')) {
    return { eligible: false, reason: `Partner does not accept "${textile.condition}" condition`, isLocal: false, isSameState: false };
  }

  // 5. Capacity check
  const weight = Number(textile.estimatedWeightKg || 0);
  if (partner.capacityKgPerMonth != null && partner.capacityKgPerMonth > 0) {
    const currentLoad = Number(partner.currentLoadKg || 0);
    if (currentLoad + weight > partner.capacityKgPerMonth) {
      return { eligible: false, reason: 'Partner monthly capacity exceeded', isLocal: false, isSameState: false };
    }
  }

  // 6. Proximity checks
  const textileCity = (textile.location?.city || '').trim().toLowerCase();
  const partnerCity = (partner.location?.city || '').trim().toLowerCase();
  const isLocal = Boolean(textileCity && partnerCity && textileCity === partnerCity);

  const textileState = (textile.location?.state || '').trim().toLowerCase();
  const partnerState = (partner.location?.state || '').trim().toLowerCase();
  const isSameState = Boolean(textileState && partnerState && textileState === partnerState);

  return { eligible: true, isLocal, isSameState };
}

/**
 * Matches a textile across all its recommended pathways against a list of partners.
 *
 * @param {{
 *   material: string,
 *   condition: string,
 *   estimatedWeightKg?: number,
 *   location?: { city?: string, state?: string },
 *   recommendedPathways: Array<{ pathway: string, confidence: string, reason: string }>
 * }} textile
 * @param {Array<object>} partners
 * @returns {{
 *   pathwayMatches: Array<{
 *     pathway: string,
 *     confidence: string,
 *     engineReason: string,
 *     status: 'available' | 'awaiting_match',
 *     statusMessage: string,
 *     partners: Array<object>
 *   }>,
 *   hasAnyMatch: boolean,
 *   totalMatchesCount: number
 * }}
 */
export function matchTextileToPartners(textile, partners = []) {
  const pathways = textile.recommendedPathways || [];

  let totalMatchesCount = 0;

  const pathwayMatches = pathways.map((item) => {
    const pathway = item.pathway;

    // Find all eligible partners for this pathway
    const eligibleList = [];
    for (const partner of partners) {
      const check = checkPartnerEligibility(textile, pathway, partner);
      if (check.eligible) {
        eligibleList.push({
          _id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          description: partner.description || '',
          location: partner.location || {},
          supportedPathways: partner.supportedPathways || [],
          capacityKgPerMonth: partner.capacityKgPerMonth,
          currentLoadKg: partner.currentLoadKg,
          availableCapacityKg: partner.capacityKgPerMonth != null
            ? Math.max(0, partner.capacityKgPerMonth - (partner.currentLoadKg || 0))
            : null,
          isLocal: check.isLocal,
          isSameState: check.isSameState
        });
      }
    }

    // Sort: Local partners first, then same state, then highest available capacity
    eligibleList.sort((a, b) => {
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      if (a.isSameState && !b.isSameState) return -1;
      if (!a.isSameState && b.isSameState) return 1;
      return (b.availableCapacityKg || 0) - (a.availableCapacityKg || 0);
    });

    const isAvailable = eligibleList.length > 0;
    if (isAvailable) totalMatchesCount += eligibleList.length;

    return {
      pathway,
      confidence: item.confidence,
      engineReason: item.reason,
      status: isAvailable ? 'available' : 'awaiting_match',
      statusMessage: isAvailable
        ? `${eligibleList.length} verified partner${eligibleList.length === 1 ? '' : 's'} available for this pathway`
        : `No verified partner is currently available for ${pathway}. You can flag this textile as awaiting match.`,
      partners: eligibleList
    };
  });

  return {
    pathwayMatches,
    hasAnyMatch: totalMatchesCount > 0,
    totalMatchesCount
  };
}
