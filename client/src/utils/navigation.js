export function dashboardPath(user) {
  if (!user) return '/login';
  if (user.role === 'partner') return '/partner';
  if (user.role === 'admin') return '/admin';
  return '/textiles';
}

export function homePath(user) {
  return dashboardPath(user);
}
