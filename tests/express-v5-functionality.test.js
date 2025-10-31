const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;

describe('Express v5 Basic Functionality', () => {
  let app;

  beforeEach(() => {
    app = express();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Express v5 Features', () => {
    test('should create Express app successfully', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
      expect(typeof app.get).toBe('function');
      expect(typeof app.post).toBe('function');
      expect(typeof app.use).toBe('function');
    });

    test('should handle basic GET routes', async () => {
      app.get('/test', (req, res) => {
        res.json({ message: 'Express v5 GET route working' });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'Express v5 GET route working' });
    });

    test('should handle basic POST routes with JSON middleware', async () => {
      app.use(express.json());
      
      app.post('/api/data', (req, res) => {
        res.json({ received: req.body, method: req.method });
      });

      const testData = { name: 'test', value: 42 };
      const response = await request(app)
        .post('/api/data')
        .send(testData)
        .expect(200);

      expect(response.body.received).toEqual(testData);
      expect(response.body.method).toBe('POST');
    });

    test('should serve static files correctly', async () => {
      // Mock static directory setup
      app.use('/static', express.static(__dirname));

      const response = await request(app)
        .get('/static/express-v5-functionality.test.js')
        .expect(200);

      expect(response.text).toContain('Express v5');
    });

    test('should handle middleware stack correctly', async () => {
      const middleware1 = jest.fn((req, res, next) => {
        req.test1 = 'middleware1';
        next();
      });

      const middleware2 = jest.fn((req, res, next) => {
        req.test2 = 'middleware2';
        next();
      });

      app.use(middleware1);
      app.use(middleware2);

      app.get('/middleware-test', (req, res) => {
        res.json({
          test1: req.test1,
          test2: req.test2
        });
      });

      const response = await request(app)
        .get('/middleware-test')
        .expect(200);

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(response.body).toEqual({
        test1: 'middleware1',
        test2: 'middleware2'
      });
    });
  });

  describe('Gallery-Specific Express v5 Routes', () => {
    beforeEach(() => {
      app.use(express.json());
    });

    test('should handle gallery API routes', async () => {
      // Mock gallery data
      const mockGalleryData = {
        galleries: {
          '.': [
            { name: 'image1.jpg', relativePath: 'image1.jpg', type: 'image', thumbnail: '/thumb1.jpg' },
            { name: 'image2.png', relativePath: 'image2.png', type: 'image', thumbnail: '/thumb2.jpg' }
          ]
        }
      };

      app.get('/api/gallery', (req, res) => {
        res.json(mockGalleryData);
      });

      const response = await request(app)
        .get('/api/gallery')
        .expect(200);

      expect(response.body).toEqual(mockGalleryData);
      expect(response.body.galleries['.']).toHaveLength(2);
    });

    test('should handle viewport items POST endpoint', async () => {
      let receivedPaths = [];

      app.post('/api/viewport-items', (req, res) => {
        const { relativePaths } = req.body;
        receivedPaths = relativePaths;
        res.json({ queued: relativePaths ? relativePaths.length : 0 });
      });

      const testPaths = ['image1.jpg', 'image2.png', 'video1.mp4'];
      
      const response = await request(app)
        .post('/api/viewport-items')
        .send({ relativePaths: testPaths })
        .expect(200);

      expect(receivedPaths).toEqual(testPaths);
      expect(response.body.queued).toBe(3);
    });

    test('should handle pause thumbnails POST endpoint', async () => {
      let isPaused = false;

      app.post('/api/pause-thumbnails', (req, res) => {
        isPaused = !isPaused;
        res.json({ isPaused });
      });

      // First request - should pause
      let response = await request(app)
        .post('/api/pause-thumbnails')
        .expect(200);
      expect(response.body.isPaused).toBe(true);

      // Second request - should unpause
      response = await request(app)
        .post('/api/pause-thumbnails')
        .expect(200);
      expect(response.body.isPaused).toBe(false);
    });

    test('should handle rescan POST endpoint', async () => {
      let rescanCalled = false;

      app.post('/api/rescan', (req, res) => {
        rescanCalled = true;
        res.json({ success: true, message: 'Rescan initiated' });
      });

      const response = await request(app)
        .post('/api/rescan')
        .expect(200);

      expect(rescanCalled).toBe(true);
      expect(response.body.success).toBe(true);
    });

    test('should handle upgrade POST endpoint', async () => {
      let upgradeCalled = false;

      app.post('/api/upgrade', (req, res) => {
        upgradeCalled = true;
        res.json({ message: 'Upgrade completed - HTML/JS/CSS regenerated' });
      });

      const response = await request(app)
        .post('/api/upgrade')
        .expect(200);

      expect(upgradeCalled).toBe(true);
      expect(response.body.message).toBe('Upgrade completed - HTML/JS/CSS regenerated');
    });

    test('should handle image serving routes with path parameters', async () => {
      app.get(/^\/image\/(.*)/, (req, res) => {
        const imagePath = req.params[0];
        res.json({ 
          message: 'Image route working',
          requestedPath: imagePath,
          method: req.method 
        });
      });

      const response = await request(app)
        .get('/image/subfolder/test%20image.jpg')
        .expect(200);

      expect(response.body.requestedPath).toBe('subfolder/test image.jpg');
      expect(response.body.message).toBe('Image route working');
    });
  });

  describe('Express v5 Error Handling', () => {
    test('should handle 404 errors gracefully', async () => {
      app.use((req, res) => {
        res.status(404).json({ error: 'Not Found', path: req.path });
      });

      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.path).toBe('/nonexistent-route');
    });

    test('should handle async route errors', async () => {
      app.get('/error-route', async (req, res, next) => {
        try {
          throw new Error('Test async error');
        } catch (error) {
          next(error);
        }
      });

      // Error handler
      app.use((error, req, res, next) => {
        res.status(500).json({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      });

      const response = await request(app)
        .get('/error-route')
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
      expect(response.body.message).toBe('Test async error');
    });

    test('should handle malformed JSON requests', async () => {
      app.use(express.json());

      app.post('/json-test', (req, res) => {
        res.json({ received: req.body });
      });

      // Error handler for JSON parsing errors
      app.use((error, req, res, next) => {
        if (error.type === 'entity.parse.failed') {
          res.status(400).json({ error: 'Invalid JSON' });
        } else {
          next(error);
        }
      });

      const response = await request(app)
        .post('/json-test')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toBe('Invalid JSON');
    });
  });

  describe('Express v5 Server-Sent Events Compatibility', () => {
    test('should support SSE endpoints with proper headers', async () => {
      app.get('/events', (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        
        res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
        
        // Simulate periodic updates
        let counter = 0;
        const interval = setInterval(() => {
          if (counter >= 2) {
            clearInterval(interval);
            res.end();
            return;
          }
          
          res.write(`data: ${JSON.stringify({ 
            type: 'update', 
            count: ++counter 
          })}\n\n`);
        }, 10);
      });

      const response = await request(app)
        .get('/events')
        .expect(200)
        .expect('Content-Type', 'text/event-stream')
        .expect('Cache-Control', 'no-cache')
        .expect('Connection', 'keep-alive');

      // Verify SSE message format
      expect(response.text).toMatch(/data: \{"type":"connected"\}\n\n/);
      expect(response.text).toMatch(/data: \{"type":"update","count":1\}\n\n/);
      expect(response.text).toMatch(/data: \{"type":"update","count":2\}\n\n/);
    });

    test('should handle SSE client disconnection gracefully', (done) => {
      const clients = new Set();

      app.get('/events-disconnect', (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        clients.add(res);
        res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
        
        req.on('close', () => {
          clients.delete(res);
          expect(clients.size).toBe(0);
          done();
        });
      });

      // Start request and immediately abort it
      const req = request(app).get('/events-disconnect');
      req.end();
      setTimeout(() => req.abort(), 10);
    });
  });

  describe('Express v5 Performance and Memory', () => {
    test('should handle multiple concurrent requests', async () => {
      app.get('/concurrent/:id', (req, res) => {
        const id = req.params.id;
        // Simulate some async work
        setTimeout(() => {
          res.json({ id, timestamp: Date.now() });
        }, Math.random() * 50);
      });

      // Send 10 concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) => 
        request(app).get(`/concurrent/${i}`).expect(200)
      );

      const responses = await Promise.all(promises);
      
      // Verify all requests completed successfully
      expect(responses).toHaveLength(10);
      responses.forEach((response, index) => {
        expect(response.body.id).toBe(index.toString());
        expect(typeof response.body.timestamp).toBe('number');
      });
    });

    test('should properly clean up resources', async () => {
      const resources = new Set();

      app.get('/resource-test', (req, res) => {
        const resourceId = Date.now() + Math.random();
        resources.add(resourceId);
        
        res.on('close', () => {
          resources.delete(resourceId);
        });
        
        res.json({ 
          resourceId,
          totalResources: resources.size 
        });
      });

      // Make requests
      const response1 = await request(app).get('/resource-test').expect(200);
      const response2 = await request(app).get('/resource-test').expect(200);

      // Resources should be cleaned up after responses
      expect(resources.size).toBe(0);
    });
  });

  describe('Express v5 Specific Features', () => {
    test('should verify Express version is 5.x', () => {
      const expressVersion = require('express/package.json').version;
      expect(expressVersion).toMatch(/^5\./);
    });

    test('should support updated middleware patterns', () => {
      // Test that Express v5 middleware patterns work
      const middlewareFunction = (req, res, next) => {
        req.testProperty = 'Express v5 middleware';
        next();
      };

      app.use(middlewareFunction);
      app.get('/middleware-pattern', (req, res) => {
        res.json({ property: req.testProperty });
      });

      return request(app)
        .get('/middleware-pattern')
        .expect(200)
        .then(response => {
          expect(response.body.property).toBe('Express v5 middleware');
        });
    });

    test('should handle route parameters and query strings correctly', async () => {
      app.get('/api/:category/:id', (req, res) => {
        res.json({
          params: req.params,
          query: req.query,
          url: req.url,
          method: req.method
        });
      });

      const response = await request(app)
        .get('/api/images/123?filter=recent&limit=10')
        .expect(200);

      expect(response.body.params).toEqual({ category: 'images', id: '123' });
      expect(response.body.query).toEqual({ filter: 'recent', limit: '10' });
      expect(response.body.method).toBe('GET');
    });

    test('should support Express v5 async error handling improvements', async () => {
      // Express v5 should handle promise rejections better
      app.get('/async-error', async (req, res) => {
        await new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Async operation failed')), 10);
        });
      });

      // Global error handler
      app.use((err, req, res, next) => {
        res.status(500).json({ 
          error: 'Caught async error',
          message: err.message 
        });
      });

      const response = await request(app)
        .get('/async-error')
        .expect(500);

      expect(response.body.error).toBe('Caught async error');
      expect(response.body.message).toBe('Async operation failed');
    });
  });
});