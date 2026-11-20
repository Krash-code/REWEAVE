import Partner from '../models/Partner.js';

export function findPartnerOrgForUser(user) {
  if (!user) return null;
  return Partner.findOne({
    $or: [{ user: user._id }, { email: user.email }]
  });
}
