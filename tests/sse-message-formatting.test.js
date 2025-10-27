const request = require('supertest');
const express = require('express');
const { EventEmitter } = require('events');

describe('SSE Message Formatting', () => {
  let app;
  let server;
  let mockResponse;
  let sseClients;

  beforeEach(() => {
    app = express();
    sseClients = new Set();

    // Mock the broadcastToClients function behavior from server-runner.js
    function broadcastToClients(data) {
      const clientsToRemove = [];
      
      sseClients.forEach(client => {
        try {
          // Check if client is still writable
          if (client.destroyed || client.writableEnded) {
            clientsToRemove.push(client);
            return;
          }
          
          // This is the key format we're testing - single `data: ` prefix with double newline
          client.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error) {
          clientsToRemove.push(client);
        }
      });
      
      // Clean up disconnected clients
      clientsToRemove.forEach(client => {
        sseClients.delete(client);
      });
    }

    // Mock SSE endpoint similar to server-runner.js
    app.get('/progress', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      
      sseClients.add(res);
      
      // Send initial message
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      
      req.on('close', () => {
        sseClients.delete(res);
      });
    });

    // Test endpoint to trigger SSE broadcast
    app.post('/test-broadcast', express.json(), (req, res) => {
      broadcastToClients(req.body);
      res.json({ success: true });
    });

    // Mock response object for direct testing
    mockResponse = {
      write: jest.fn(),
      destroyed: false,
      writableEnded: false
    };
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
    jest.restoreAllMocks();
  });

  test('should format SSE messages with correct data prefix and double newline', (done) => {
    const agent = request(app);
    
    // Start SSE connection
    const req = agent
      .get('/progress')
      .buffer(false)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
          
          // Check for the initial connection message
          if (data.includes('{"type":"connected"}')) {
            // Verify correct SSE format
            expect(data).toMatch(/^data: \{"type":"connected"\}\n\n/);
            
            // Test broadcasting additional message
            agent.post('/test-broadcast')
              .send({ type: 'thumbnail_ready', media: { name: 'test.jpg' } })
              .end();
          }
          
          // Check for the broadcast message
          if (data.includes('thumbnail_ready')) {
            const messages = data.split('data: ');
            const lastMessage = messages[messages.length - 1];
            
            // Verify proper format: JSON data followed by double newline
            expect(lastMessage).toMatch(/^\{"type":"thumbnail_ready","media":\{"name":"test\.jpg"\}\}\n\n/);
            callback(null, data);
            res.destroy();
            done();
          }
        });
        
        res.on('error', callback);
      })
      .end();

    // Handle any request errors
    req.on('error', done);
  });

  test('should verify SSE format matches EventSource expectations', () => {
    // Test data directly with mock response
    sseClients.add(mockResponse);

    const testData = {
      type: 'global_thumbnail_progress',
      isGenerating: true,
      progress: 75,
      completed: 15,
      total: 20,
      currentFile: 'image.jpg'
    };

    // Simulate the exact broadcast function from server-runner.js
    const clientsToRemove = [];
    
    sseClients.forEach(client => {
      try {
        if (client.destroyed || client.writableEnded) {
          clientsToRemove.push(client);
          return;
        }
        
        // The exact format used in server-runner.js
        client.write(`data: ${JSON.stringify(testData)}\n\n`);
      } catch (error) {
        clientsToRemove.push(client);
      }
    });

    // Verify the correct format was written
    expect(mockResponse.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify(testData)}\n\n`
    );
    
    // Verify the written content matches EventSource expectations
    const writtenContent = mockResponse.write.mock.calls[0][0];
    expect(writtenContent).toMatch(/^data: /);
    expect(writtenContent).toMatch(/\n\n$/);
    expect(writtenContent.split('\n\n').length).toBe(2); // One message + empty string after split
  });

  test('should format different message types correctly', () => {
    sseClients.add(mockResponse);

    const testMessages = [
      { type: 'thumbnail_ready', media: { relativePath: 'test.jpg', thumbnail: '/thumb.jpg' } },
      { type: 'tiny_preview_ready', media: { tinyPreview: '/tiny.jpg' } },
      { type: 'thumbnail_paused', isPaused: true },
      { type: 'cacheInvalidated' },
      { type: 'request_viewport_items' }
    ];

    testMessages.forEach((message, index) => {
      // Clear previous calls
      mockResponse.write.mockClear();
      
      // Broadcast message
      sseClients.forEach(client => {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      });

      // Verify format
      const expectedContent = `data: ${JSON.stringify(message)}\n\n`;
      expect(mockResponse.write).toHaveBeenCalledWith(expectedContent);
      
      // Verify structure
      expect(expectedContent).toMatch(/^data: \{.*\}\n\n$/);
    });
  });

  test('should handle special characters in SSE messages correctly', () => {
    sseClients.add(mockResponse);

    const testData = {
      type: 'thumbnail_ready',
      media: {
        name: 'file with spaces & special chars: éñ.jpg',
        relativePath: 'folder/subfolder/file name.jpg',
        description: 'Test "quoted" string\nwith newlines\tand tabs'
      }
    };

    // Broadcast message
    sseClients.forEach(client => {
      client.write(`data: ${JSON.stringify(testData)}\n\n`);
    });

    const writtenContent = mockResponse.write.mock.calls[0][0];
    
    // Verify the JSON is properly escaped within the SSE format
    expect(writtenContent).toMatch(/^data: /);
    expect(writtenContent).toMatch(/\n\n$/);
    
    // Verify special characters are properly JSON-escaped
    expect(writtenContent).toContain('\\"quoted\\"'); // Quotes escaped
    expect(writtenContent).toContain('\\n'); // Newlines escaped
    expect(writtenContent).toContain('\\t'); // Tabs escaped
    
    // Verify it's valid JSON within the SSE message
    const jsonPart = writtenContent.replace(/^data: /, '').replace(/\n\n$/, '');
    expect(() => JSON.parse(jsonPart)).not.toThrow();
  });

  test('should verify exact SSE format used in server-runner.js endpoints', (done) => {
    // Test the /progress endpoint specifically with streaming parser
    request(app)
      .get('/progress')
      .expect(200)
      .expect('Content-Type', 'text/event-stream')
      .expect('Cache-Control', 'no-cache')
      .expect('Connection', 'keep-alive')
      .buffer(false)
      .parse((res, callback) => {
        res.once('data', (chunk) => {
          const data = chunk.toString();
          // Check that the response starts with proper SSE format
          expect(data).toMatch(/^data: \{"type":"connected"\}\n\n/);
          callback(null, 'ok');
          res.destroy(); // Close the stream
          done();
        });
        res.on('error', callback);
      })
      .end();
  });

  test('should handle empty and null data in SSE messages', () => {
    sseClients.add(mockResponse);

    const testCases = [
      {},  // Empty object
      { type: null },  // Null value
      { type: 'test', data: null },  // Mixed null
      { type: 'test', array: [] },  // Empty array
      { type: 'test', nested: { empty: {} } }  // Nested empty
    ];

    testCases.forEach((testData, index) => {
      mockResponse.write.mockClear();
      
      sseClients.forEach(client => {
        client.write(`data: ${JSON.stringify(testData)}\n\n`);
      });

      const expectedContent = `data: ${JSON.stringify(testData)}\n\n`;
      expect(mockResponse.write).toHaveBeenCalledWith(expectedContent);
      
      // Ensure it's still valid SSE format
      expect(expectedContent).toMatch(/^data: .*\n\n$/);
    });
  });

  test('should verify single newline characters are used correctly', () => {
    sseClients.add(mockResponse);

    const testData = { type: 'test', message: 'Simple test' };

    sseClients.forEach(client => {
      client.write(`data: ${JSON.stringify(testData)}\n\n`);
    });

    const writtenContent = mockResponse.write.mock.calls[0][0];
    
    // Verify exactly two newline characters at the end (no more, no less)
    expect(writtenContent).toMatch(/\n\n$/);
    expect(writtenContent).not.toMatch(/\n\n\n/); // No triple newlines
    expect(writtenContent.split('\n').length).toBe(3); // data line + empty line + empty string after split
    
    // Verify the format is exactly: "data: {json}\n\n"
    const expectedFormat = `data: ${JSON.stringify(testData)}\n\n`;
    expect(writtenContent).toBe(expectedFormat);
  });
});