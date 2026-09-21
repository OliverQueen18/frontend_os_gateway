export const environment = {
  production: true,
  // Même origine via Nginx (HTTPS) — pas d'URL absolue nécessaire
  apiUrl: '/api/v1',
  wsUrl: 'wss://osgateway.olive-services.net/ws/gateways',
  useMockFallback: false,
};
