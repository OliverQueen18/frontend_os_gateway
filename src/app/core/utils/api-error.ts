/** Extrait un message lisible depuis une erreur HttpClient / ApiResponse. */
export function apiErrorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (!err) return fallback;
  const e = err as {
    status?: number;
    message?: string;
    error?: { message?: string; errorCode?: string; details?: string | string[] };
  };
  if (e.status === 0) {
    return 'API injoignable — vérifiez que le backend tourne';
  }
  if (e.status === 401) {
    return 'Session invalide ou expirée — reconnectez-vous';
  }
  if (e.status === 403) {
    return 'Accès refusé pour cette action';
  }
  const details = e.error?.details;
  if (Array.isArray(details) && details.length) {
    return details.join(' · ');
  }
  if (typeof details === 'string' && details.trim()) {
    return details;
  }
  return e.error?.message || e.message || fallback;
}
