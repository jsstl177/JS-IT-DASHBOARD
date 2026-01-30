jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const axios = require('axios');
const { getAutomationLogs } = require('../../services/automationLog');

// Set up mock axios client
const mockClient = {
  get: jest.fn(),
  post: jest.fn()
};
axios.create.mockReturnValue(mockClient);

describe('Automation Log Service - getAutomationLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue(mockClient);
  });

  it('should return sourceUrl and items on successful fetch', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        logs: [
          { id: 1, timestamp: '2025-01-01T00:00:00Z', level: 'info', message: 'Backup completed', source: 'cron' },
          { id: 2, timestamp: '2025-01-01T01:00:00Z', level: 'error', message: 'Sync failed', source: 'sync-agent' }
        ]
      }
    });

    const result = await getAutomationLogs('http://logs.local:8080');

    expect(result.sourceUrl).toBe('http://logs.local:8080');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      id: 1,
      timestamp: '2025-01-01T00:00:00Z',
      level: 'info',
      message: 'Backup completed',
      source: 'cron'
    });
    expect(result.items[1]).toEqual({
      id: 2,
      timestamp: '2025-01-01T01:00:00Z',
      level: 'error',
      message: 'Sync failed',
      source: 'sync-agent'
    });
  });

  it('should return last 10 logs from a longer array', async () => {
    const manyLogs = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      timestamp: `2025-01-01T${String(i).padStart(2, '0')}:00:00Z`,
      level: 'info',
      message: `Log entry ${i + 1}`,
      source: 'automation'
    }));

    mockClient.get.mockResolvedValue({
      data: { logs: manyLogs }
    });

    const result = await getAutomationLogs('http://logs.local:8080');

    expect(result.items).toHaveLength(10);
    // Should be the last 10 (ids 16-25)
    expect(result.items[0].id).toBe(16);
    expect(result.items[9].id).toBe(25);
  });

  it('should return all logs when array has fewer than 10 items', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        logs: [
          { id: 1, timestamp: '2025-01-01T00:00:00Z', level: 'info', message: 'Log 1', source: 'auto' },
          { id: 2, timestamp: '2025-01-01T01:00:00Z', level: 'warn', message: 'Log 2', source: 'auto' }
        ]
      }
    });

    const result = await getAutomationLogs('http://logs.local:8080');

    expect(result.items).toHaveLength(2);
  });

  it('should return empty items on error', async () => {
    mockClient.get.mockRejectedValue(new Error('Service unavailable'));

    const result = await getAutomationLogs('http://logs.local:8080');

    expect(result.sourceUrl).toBe('http://logs.local:8080');
    expect(result.items).toEqual([]);
  });

  it('should handle data directly as array (fallback when no logs key)', async () => {
    mockClient.get.mockResolvedValue({
      data: [
        { id: 1, timestamp: '2025-01-01T00:00:00Z', level: 'info', message: 'Direct data', source: 'agent' }
      ]
    });

    const result = await getAutomationLogs('http://logs.local:8080');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].message).toBe('Direct data');
  });

  it('should default source to "automation" when not provided', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        logs: [
          { id: 1, timestamp: '2025-01-01T00:00:00Z', level: 'info', message: 'No source' }
        ]
      }
    });

    const result = await getAutomationLogs('http://logs.local:8080');

    expect(result.items[0].source).toBe('automation');
  });

  it('should handle empty logs array', async () => {
    mockClient.get.mockResolvedValue({
      data: { logs: [] }
    });

    const result = await getAutomationLogs('http://logs.local:8080');

    expect(result.sourceUrl).toBe('http://logs.local:8080');
    expect(result.items).toEqual([]);
  });

  it('should create axios client with correct config', async () => {
    mockClient.get.mockResolvedValue({ data: { logs: [] } });

    await getAutomationLogs('http://logs.local:8080');

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://logs.local:8080',
      timeout: 10000
    });
  });

  it('should call GET /logs endpoint', async () => {
    mockClient.get.mockResolvedValue({ data: { logs: [] } });

    await getAutomationLogs('http://logs.local:8080');

    expect(mockClient.get).toHaveBeenCalledWith('/logs');
  });

  it('should handle network timeout', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    mockClient.get.mockRejectedValue(timeoutError);

    const result = await getAutomationLogs('http://logs.local:8080');

    expect(result.sourceUrl).toBe('http://logs.local:8080');
    expect(result.items).toEqual([]);
  });
});
