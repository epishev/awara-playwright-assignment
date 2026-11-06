import { expect, test } from '@playwright/test';

// The assignment names the collection "status.result.data". The real response is
// { status: "ok", result: { data: [...], total_count: N, ... } }, so the products
// collection is at result.data and "status" is a sibling string, not a parent.

test('GET /products?brand=awara returns a non-empty product list', async ({ request }) => {
  const response = await request.get('/products', { params: { brand: 'awara' } });
  expect(response.status()).toBe(200);

  const body: unknown = await response.json();
  expect(body).toMatchObject({ status: 'ok', result: { data: expect.any(Array) } });
  const { data } = (body as { result: { data: unknown[] } }).result;
  expect(data.length).toBeGreaterThan(0);
});

test('GET /products by name returns exactly the requested product', async ({ request }) => {
  const name = 'the-awara-hybrid-mattress-30';
  const response = await request.get('/products', { params: { name, lang: 'en', brand: 'awara' } });
  expect(response.status()).toBe(200);

  const body: unknown = await response.json();
  expect(body).toMatchObject({ status: 'ok', result: { data: expect.any(Array) } });
  const { data } = (body as { result: { data: unknown[] } }).result;
  expect(data).toHaveLength(1);
  expect(data[0]).toMatchObject({ name });
});
