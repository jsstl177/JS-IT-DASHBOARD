jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const axios = require('axios');
const { getNetworkStatus } = require('../../services/uptimeKuma');

// Set up mock axios client
const mockClient = {
  get: jest.fn(),
  post: jest.fn()
};
axios.create.mockReturnValue(mockClient);

describe('Uptime Kuma Service - getNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue(mockClient);
  });

  it('should return sourceUrl and items array on successful fetch', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        monitors: [
          { id: 1, name: 'Server A', status: 0, url: 'http://server-a', ping: 50, uptime: 99.9 },
          { id: 2, name: 'Server B', status: 1, url: 'http://server-b', ping: 20, uptime: 100 },
          { id: 3, name: 'Server C', status: 2, url: 'http://server-c', ping: 100, uptime: 95.0 }
        ]
      }
    });

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.sourceUrl).toBe('http://uptime.local:3001/status/everything');
    expect(Array.isArray(result.items)).toBe(true);
    // Should only include down (0) and alerting (2) monitors
    expect(result.items).toHaveLength(2);
  });

  it('should filter only down and alerting monitors', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        monitors: [
          { id: 1, name: 'Down Server', status: 0, url: 'http://down', ping: 0, uptime: 80 },
          { id: 2, name: 'Up Server', status: 1, url: 'http://up', ping: 20, uptime: 100 },
          { id: 3, name: 'Alerting Server', status: 2, url: 'http://alerting', ping: 500, uptime: 90 },
          { id: 4, name: 'Another Up', status: 1, url: 'http://up2', ping: 10, uptime: 99.99 }
        ]
      }
    });

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Down Server');
    expect(result.items[0].status).toBe('down');
    expect(result.items[1].name).toBe('Alerting Server');
    expect(result.items[1].status).toBe('alerting');
  });

  it('should map monitor fields correctly', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        monitors: [
          { id: 42, name: 'Test Monitor', status: 0, url: 'http://test.com', ping: 150, uptime: 85.5 }
        ]
      }
    });

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.items[0]).toEqual({
      id: 42,
      name: 'Test Monitor',
      status: 'down',
      url: 'http://test.com',
      lastPing: 150,
      uptime: 85.5
    });
  });

  it('should return empty items on error', async () => {
    mockClient.get.mockRejectedValue(new Error('Connection refused'));

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.sourceUrl).toBe('http://uptime.local:3001');
    expect(result.items).toEqual([]);
  });

  it('should handle timeout errors', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    mockClient.get.mockRejectedValue(timeoutError);

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.sourceUrl).toBe('http://uptime.local:3001');
    expect(result.items).toEqual([]);
  });

  it('should handle empty monitors array', async () => {
    mockClient.get.mockResolvedValue({
      data: { monitors: [] }
    });

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.sourceUrl).toBe('http://uptime.local:3001/status/everything');
    expect(result.items).toEqual([]);
  });

  it('should handle response without monitors key', async () => {
    mockClient.get.mockResolvedValue({
      data: {}
    });

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.sourceUrl).toBe('http://uptime.local:3001/status/everything');
    expect(result.items).toEqual([]);
  });

  it('should create axios client with correct config', async () => {
    mockClient.get.mockResolvedValue({ data: { monitors: [] } });

    await getNetworkStatus('http://uptime.local:3001');

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://uptime.local:3001',
      timeout: 10000
    });
  });
});
