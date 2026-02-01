jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const axios = require('axios');
const { getNetworkStatus, parseUptimeKumaUrl } = require('../../services/uptimeKuma');

// Set up mock axios client
const mockClient = {
  get: jest.fn(),
  post: jest.fn()
};
axios.create.mockReturnValue(mockClient);

// Helper to build mock responses matching real Uptime Kuma API structure
function mockStatusPage(monitors) {
  // /api/status-page/everything
  const statusData = {
    publicGroupList: [{
      id: 1,
      name: 'Services',
      monitorList: monitors.map(m => ({ id: m.id, name: m.name, url: m.url }))
    }]
  };

  // /api/status-page/heartbeat/everything
  const heartbeatList = {};
  const uptimeList = {};
  for (const m of monitors) {
    heartbeatList[m.id] = [{ status: m.status, ping: m.ping, time: '2026-01-01T00:00:00Z' }];
    if (m.uptime !== undefined) {
      uptimeList[`${m.id}_24`] = m.uptime;
    }
  }

  mockClient.get.mockImplementation((url) => {
    if (url.includes('/heartbeat/')) {
      return Promise.resolve({ data: { heartbeatList, uptimeList } });
    }
    return Promise.resolve({ data: statusData });
  });
}

describe('Uptime Kuma Service - getNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue(mockClient);
  });

  it('should return sourceUrl and items array on successful fetch', async () => {
    mockStatusPage([
      { id: 1, name: 'Server A', status: 0, url: 'http://server-a', ping: 50, uptime: 99.9 },
      { id: 2, name: 'Server B', status: 1, url: 'http://server-b', ping: 20, uptime: 100 },
      { id: 3, name: 'Server C', status: 2, url: 'http://server-c', ping: 100, uptime: 95.0 }
    ]);

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.sourceUrl).toBe('http://uptime.local:3001/status/everything');
    expect(result.totalMonitors).toBe(3);
    expect(Array.isArray(result.items)).toBe(true);
    // Should include down (0) and pending (2), not up (1)
    expect(result.items).toHaveLength(2);
  });

  it('should filter only non-UP monitors', async () => {
    mockStatusPage([
      { id: 1, name: 'Down Server', status: 0, url: 'http://down', ping: 0, uptime: 80 },
      { id: 2, name: 'Up Server', status: 1, url: 'http://up', ping: 20, uptime: 100 },
      { id: 3, name: 'Pending Server', status: 2, url: 'http://pending', ping: 500, uptime: 90 },
      { id: 4, name: 'Maintenance Server', status: 3, url: 'http://maint', ping: 10, uptime: 99.99 }
    ]);

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.totalMonitors).toBe(4);
    expect(result.items).toHaveLength(3);
    expect(result.items[0].name).toBe('Down Server');
    expect(result.items[0].status).toBe('down');
    expect(result.items[1].name).toBe('Pending Server');
    expect(result.items[1].status).toBe('pending');
    expect(result.items[2].name).toBe('Maintenance Server');
    expect(result.items[2].status).toBe('maintenance');
  });

  it('should map monitor fields correctly', async () => {
    mockStatusPage([
      { id: 42, name: 'Test Monitor', status: 0, url: 'http://test.com', ping: 150, uptime: 85.5 }
    ]);

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
    expect(result.totalMonitors).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('should handle timeout errors', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    mockClient.get.mockRejectedValue(timeoutError);

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.sourceUrl).toBe('http://uptime.local:3001');
    expect(result.totalMonitors).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('should handle empty publicGroupList', async () => {
    mockClient.get.mockImplementation((url) => {
      if (url.includes('/heartbeat/')) {
        return Promise.resolve({ data: { heartbeatList: {}, uptimeList: {} } });
      }
      return Promise.resolve({ data: { publicGroupList: [] } });
    });

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.sourceUrl).toBe('http://uptime.local:3001/status/everything');
    expect(result.totalMonitors).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('should handle response without publicGroupList key', async () => {
    mockClient.get.mockImplementation((url) => {
      if (url.includes('/heartbeat/')) {
        return Promise.resolve({ data: { heartbeatList: {}, uptimeList: {} } });
      }
      return Promise.resolve({ data: {} });
    });

    const result = await getNetworkStatus('http://uptime.local:3001');

    expect(result.sourceUrl).toBe('http://uptime.local:3001/status/everything');
    expect(result.totalMonitors).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('should create axios client with correct config', async () => {
    mockClient.get.mockImplementation((url) => {
      if (url.includes('/heartbeat/')) {
        return Promise.resolve({ data: { heartbeatList: {}, uptimeList: {} } });
      }
      return Promise.resolve({ data: { publicGroupList: [] } });
    });

    await getNetworkStatus('http://uptime.local:3001');

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://uptime.local:3001',
      timeout: 10000
    });
  });

  it('should fetch both status page and heartbeat endpoints', async () => {
    mockClient.get.mockImplementation((url) => {
      if (url.includes('/heartbeat/')) {
        return Promise.resolve({ data: { heartbeatList: {}, uptimeList: {} } });
      }
      return Promise.resolve({ data: { publicGroupList: [] } });
    });

    await getNetworkStatus('http://uptime.local:3001');

    expect(mockClient.get).toHaveBeenCalledWith('/api/status-page/everything');
    expect(mockClient.get).toHaveBeenCalledWith('/api/status-page/heartbeat/everything');
  });

  it('should strip API path from base URL and extract slug', async () => {
    mockClient.get.mockImplementation((url) => {
      if (url.includes('/heartbeat/')) {
        return Promise.resolve({ data: { heartbeatList: {}, uptimeList: {} } });
      }
      return Promise.resolve({ data: { publicGroupList: [] } });
    });

    await getNetworkStatus('http://uptime.local:3001/api/status-page/myslug');

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://uptime.local:3001',
      timeout: 10000
    });
    expect(mockClient.get).toHaveBeenCalledWith('/api/status-page/myslug');
    expect(mockClient.get).toHaveBeenCalledWith('/api/status-page/heartbeat/myslug');
  });

  it('should extract slug from /status/ URL format', async () => {
    mockClient.get.mockImplementation((url) => {
      if (url.includes('/heartbeat/')) {
        return Promise.resolve({ data: { heartbeatList: {}, uptimeList: {} } });
      }
      return Promise.resolve({ data: { publicGroupList: [] } });
    });

    await getNetworkStatus('http://uptime.local:3001/status/myslug');

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://uptime.local:3001',
      timeout: 10000
    });
    expect(mockClient.get).toHaveBeenCalledWith('/api/status-page/myslug');
    expect(mockClient.get).toHaveBeenCalledWith('/api/status-page/heartbeat/myslug');
  });
});

describe('parseUptimeKumaUrl', () => {
  it('should return origin and default slug for plain origin URL', () => {
    expect(parseUptimeKumaUrl('https://monitor.example.com')).toEqual({
      origin: 'https://monitor.example.com',
      slug: 'everything'
    });
  });

  it('should extract slug from /api/status-page/ URL', () => {
    expect(parseUptimeKumaUrl('https://monitor.example.com/api/status-page/mypage')).toEqual({
      origin: 'https://monitor.example.com',
      slug: 'mypage'
    });
  });

  it('should extract slug from /status/ URL', () => {
    expect(parseUptimeKumaUrl('https://monitor.example.com/status/mypage')).toEqual({
      origin: 'https://monitor.example.com',
      slug: 'mypage'
    });
  });

  it('should strip trailing slashes', () => {
    expect(parseUptimeKumaUrl('https://monitor.example.com/')).toEqual({
      origin: 'https://monitor.example.com',
      slug: 'everything'
    });
  });

  it('should handle URLs with ports', () => {
    expect(parseUptimeKumaUrl('http://localhost:3001/api/status-page/test')).toEqual({
      origin: 'http://localhost:3001',
      slug: 'test'
    });
  });
});
