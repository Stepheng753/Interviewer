process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.GEMINI_API_KEY = 'test_secret_key';

const request = require('supertest');
const { app, server, db } = require('../src/index');

describe('Authentication Endpoints Tests', () => {
  let userToken = '';
  let testUserId = null;

  beforeAll((done) => {
    setTimeout(done, 500);
  });

  afterAll((done) => {
    server.close(() => {
      db.close((err) => {
        if (err) console.error('Failed to close test database:', err);
        done();
      });
    });
  });

  const testUser = {
    name: 'Testy Tester',
    email: 'testy@test.com',
    password: 'password123'
  };

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(testUser.name);
    expect(res.body.email).toBe(testUser.email);
    expect(res.body).not.toHaveProperty('password_hash');
    testUserId = res.body.id;
  });

  it('should fail to register a user with an already registered email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(500);
  });

  it('should login successfully and return a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testUser.email);
    userToken = res.body.token;
  });

  it('should fail to login with an invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
  });

  it('should retrieve current user profile from GET /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testUserId);
    expect(res.body.name).toBe(testUser.name);
    expect(res.body.email).toBe(testUser.email);
  });

  it('should deny GET /api/auth/me access without token', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('should update user profile name and email successfully', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Updated Name',
        email: 'updated@test.com'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.name).toBe('Updated Name');
    expect(res.body.user.email).toBe('updated@test.com');
    userToken = res.body.token;
  });

  it('should update user password successfully and login with new credentials', async () => {
    const resUpdate = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        password: 'newpassword123'
      });

    expect(resUpdate.status).toBe(200);

    const resLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'updated@test.com',
        password: 'newpassword123'
      });

    expect(resLogin.status).toBe(200);
    expect(resLogin.body).toHaveProperty('token');
    userToken = resLogin.body.token;
  });

  it('should deny profile updates without token', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .send({ name: 'Hackerman' });

    expect(res.status).toBe(401);
  });

  it('should fail to update name to empty', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });
});
