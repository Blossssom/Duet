export const API_ENDPOINTS = {
  GENERATE: '/api/generate',
  HISTORY: '/api/history',
} as const;

export const SSE_EVENTS = {
  CHUNK: 'chunk',
  DONE: 'done',
  ERROR: 'error',
} as const;
