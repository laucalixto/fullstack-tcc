import { test, expect } from '@playwright/test';

// ─── Walking Skeleton — smoke test ponta-a-ponta ──────────────────────────────
// Valida que o pipeline completo está funcionando:
// Browser → React App → Socket.io-client → Node Server → Socket.io → pong

test('WebSocket smoke: cliente conecta ao servidor e exibe "connected"', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('ws-status')).toHaveText('connected', {
    timeout: 10_000,
  });
});

test('Walking Skeleton: servidor responde ao health check', async ({ request }) => {
  const res = await request.get('http://localhost:3001/health');
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ ok: true });
});
