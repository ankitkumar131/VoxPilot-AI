// API smoke tests with in-memory store (no Mongo/Redis needed).
process.env.MASTER_KEY = 'test-master-key-32-bytes-minimum!!!';
process.env.DATA_DIR = './data-test';
import request from 'supertest';

let app: any;
beforeAll(async () => {
  const express = (await import('express')).default;
  const { db } = await import('../db/repository');
  await db.init();
  app = express();
  app.use(express.json());
  app.use('/api/auth', (await import('../routes/auth.routes')).default);
  app.use('/api/providers', (await import('../routes/providers.routes')).default);
  app.use('/api/agents', (await import('../routes/agents.routes')).default);
  app.use('/api/scripts', (await import('../routes/scripts.routes')).default);
  app.use('/api/calls', (await import('../routes/calls.routes')).default);
  const { errorHandler } = await import('../middleware/errorHandler');
  app.use(errorHandler);
});

describe('VoxPilot API (MVP flow)', () => {
  let token = '', agentId = '', provId = '', scriptId = '';
  const email = `t${Date.now()}@voxpilot.ai`;
  test('register + login', async () => {
    const r = await request(app).post('/api/auth/register').send({ email, password: 'Password123!', name: 'Tester' });
    expect(r.status).toBe(201);
    token = r.body.access;
  });
  test('create mock provider (key write-only)', async () => {
    const r = await request(app).post('/api/providers').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mock', kind: 'mock', model: 'mock-llm-v1' });
    expect(r.status).toBe(201);
    expect(r.body.apiKeyEnc).toBeUndefined();
    expect(r.body.apiKeySet).toBe(false);
    provId = r.body._id;
  });
  test('create script + agent', async () => {
    const s = await request(app).post('/api/scripts').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Screen', mode: 'interview', questions: [
        { text: 'Tell me about yourself.', type: 'open_ended' },
        { text: 'How many years of experience?', type: 'number', min: 0, max: 50 },
      ]});
    expect(s.status).toBe(201); scriptId = s.body._id;
    const a = await request(app).post('/api/agents').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Interviewer', scriptId, providerId: provId });
    expect(a.status).toBe(201); agentId = a.body._id;
  });
  test('simulated call completes end-to-end', async () => {
    const start = await request(app).post('/api/calls/simulate').set('Authorization', `Bearer ${token}`)
      .send({ agentId, callerName: 'Rahul' });
    expect(start.status).toBe(201);
    const callId = start.body.session._id;
    const a1 = await request(app).post(`/api/calls/${callId}/answer`).set('Authorization', `Bearer ${token}`).send({ text: 'I am a frontend developer with Angular experience.' });
    expect(a1.status).toBe(200);
    const a2 = await request(app).post(`/api/calls/${callId}/answer`).set('Authorization', `Bearer ${token}`).send({ text: 'I have 3 years of experience.' });
    expect(a2.status).toBe(200);
    expect(a2.body.done).toBe(true);
    const detail = await request(app).get(`/api/calls/${callId}`).set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.turns.length).toBeGreaterThan(3);
    expect(detail.body.summary).toBeTruthy();
  });
});
