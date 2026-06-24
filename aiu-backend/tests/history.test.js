process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.GEMINI_API_KEY = 'test_secret_key';

const request = require('supertest');
const { app, server, db } = require('../src/index');

describe('Protected Q&A History Endpoints Tests', () => {
  let userToken = '';
  let testPairId = null;

  beforeAll(async () => {
    // Wait briefly for db init
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Register a test user
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'History Tester',
        email: 'history@test.com',
        password: 'password123'
      });

    // Log the user in to retrieve token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'history@test.com',
        password: 'password123'
      });

    userToken = res.body.token;
  });

  afterAll((done) => {
    server.close(() => {
      db.close((err) => {
        if (err) console.error('Failed to close test database:', err);
        done();
      });
    });
  });

  it('should deny access to history without token', async () => {
    const res = await request(app)
      .get('/api/history');

    expect(res.status).toBe(401);
  });

  it('should return empty history array for a new user', async () => {
    const res = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('should add a QA pair successfully', async () => {
    const res = await request(app)
      .post('/api/pair')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        question: 'What is your favorite programming language?',
        answer: 'JavaScript',
        category: 'career'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.question).toBe('What is your favorite programming language?');
    expect(res.body.answer).toBe('JavaScript');
    expect(res.body.category).toBe('career');
    testPairId = res.body.id;
  });

  it('should retrieve saved history list containing the added pair', async () => {
    const res = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(testPairId);
    expect(res.body[0].answer).toBe('JavaScript');
  });

  it('should delete a single QA pair', async () => {
    const res = await request(app)
      .delete(`/api/pair/${testPairId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);

    // Verify it's deleted
    const checkRes = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${userToken}`);
    expect(checkRes.body.length).toBe(0);
  });

  it('should clear entire history list', async () => {
    // Add a pair first
    await request(app)
      .post('/api/pair')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        question: 'Do you like testing?',
        answer: 'Yes, very much'
      });

    // Clear history
    const clearRes = await request(app)
      .delete('/api/history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(clearRes.status).toBe(200);
    expect(clearRes.body).toHaveProperty('success', true);

    // Verify it is empty
    const checkRes = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${userToken}`);
    expect(checkRes.body.length).toBe(0);
  });
});
