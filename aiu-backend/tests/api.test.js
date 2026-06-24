// Set test environments
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test_secret_key';

const request = require('supertest');
const { app, server, db } = require('../src/index');

describe('AIU Backend REST API Integration Tests', () => {
  let userToken = '';
  let testUserId = null;
  let testPairId = null;

  beforeAll((done) => {
    // Wait brief moment to allow SQLite init to complete
    setTimeout(done, 500);
  });

  afterAll((done) => {
    // Clean up connections
    server.close(() => {
      db.close((err) => {
        if (err) console.error('Failed to close test database:', err);
        done();
      });
    });
  });

  describe('Authentication Endpoints', () => {
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

      expect(res.status).toBe(500); // SQLite UNIQUE constraint fails
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

  describe('Protected Q&A History Endpoints', () => {
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

  describe('Model Configuration File Validation', () => {
    const fs = require('fs');
    const path = require('path');
    const yaml = require('js-yaml');

    it('should locate and successfully parse model_config.yaml', () => {
      const configPath = path.join(__dirname, '../model_config.yaml');
      expect(fs.existsSync(configPath)).toBe(true);

      const fileContents = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContents);

      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('generationConfig');
      expect(config.generationConfig).toHaveProperty('responseModalities');

      expect(config).toHaveProperty('categories');
      expect(config.categories).toHaveProperty('career');
      expect(config.categories.career).toHaveProperty('voiceName');
      expect(config.categories).toHaveProperty('life_advice');
      expect(config.categories.life_advice).toHaveProperty('voiceName');
      expect(config.categories).toHaveProperty('family');
      expect(config.categories.family).toHaveProperty('voiceName');
      expect(config.categories).toHaveProperty('health');
      expect(config.categories.health).toHaveProperty('voiceName');

      expect(config).toHaveProperty('sessionPrompts');
      expect(config.sessionPrompts).toHaveProperty('resume');
      expect(config.sessionPrompts).toHaveProperty('returningUser');
      expect(config.sessionPrompts).toHaveProperty('newUser');
    });
  });
});

