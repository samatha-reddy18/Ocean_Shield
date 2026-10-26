/**
 * Backend integration tests: user registration and login.
 * Tests use supertest against the Express app without starting the real server.
 *
 * Requires a running MongoDB instance (set TEST_MONGO_URI, or use the MONGO_URI).
 * Run: npm test
 */
import request from 'supertest';
import app from '../src/app.js';

const uniqueEmail = () => `test_${Date.now()}@oceanshield.test`;

describe('POST /api/auth/register', () => {
  test('registers a new citizen user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: uniqueEmail(),
      password: 'Password123!',
      role: 'citizen',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.role).toBe('citizen');
    expect(res.body.password).toBeUndefined();
  });

  test('rejects duplicate email', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({
      name: 'User A', email, password: 'Password123!',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'User B', email, password: 'Password456!',
    });
    expect(res.status).toBe(409);
  });

  test('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: uniqueEmail(), password: '123',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const email = uniqueEmail();
  const password = 'TestPass123!';

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ name: 'Login Test', email, password });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass!' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  test('returns user info when authenticated', async () => {
    const email = uniqueEmail();
    const { body: created } = await request(app).post('/api/auth/register').send({
      name: 'Me Test', email, password: 'TestPass123!',
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${created.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body.password).toBeUndefined();
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
