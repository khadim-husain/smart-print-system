import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';

describe('Health Check Integration Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /health should return 200 OK and healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Smart Print API is healthy');
    expect(response.body.data.status).toBe('UP');
    expect(response.body.data.database).toBe('CONNECTED');
    expect(response.body.data.timestamp).toBeDefined();
  });
});
