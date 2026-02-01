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

// Helper to set up mock responses for both endpoints
function mockEndpoints(logs, status) {
  mockClient.get.mockImplementation((url) => {
    if (url === '/api/status') {
      return Promise.resolve({ data: status });
    }
    // /api/logs
    return Promise.resolve({ data: { logs } });
  });
}

const defaultStatus = {
  status_color: '#4CAF50',
  automation_running: true,
  queue_count: 0,
  cooldown_remaining: 0,
  file_counts: { total_files: 0, new_accounts: 0, purchasing_po: 0 },
  tasks: []
};

describe('Automation Log Service - getAutomationLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue(mockClient);
  });

  it('should return sourceUrl, status, and log lines on success', async () => {
    const logs = [
      '2026-01-31 03:15:09,093 - central_logger - INFO - Task finished.',
      '2026-01-31 03:13:48,141 - central_logger - WARNING - OCR warning'
    ];
    mockEndpoints(logs, defaultStatus);

    const result = await getAutomationLogs('http://automation.local:5000');

    expect(result.sourceUrl).toBe('http://automation.local:5000');
    expect(result.items).toEqual(logs);
    expect(result.status.running).toBe(true);
    expect(result.status.color).toBe('#4CAF50');
  });

  it('should map status fields correctly', async () => {
    const status = {
      status_color: '#F44336',
      automation_running: false,
      queue_count: 3,
      cooldown_remaining: 15,
      file_counts: { total_files: 5, new_accounts: 2, purchasing_po: 3 },
      tasks: ['task1', 'task2']
    };
    mockEndpoints([], status);

    const result = await getAutomationLogs('http://automation.local:5000');

    expect(result.status).toEqual({
      color: '#F44336',
      running: false,
      queueCount: 3,
      cooldownRemaining: 15,
      fileCounts: { total_files: 5, new_accounts: 2, purchasing_po: 3 },
      tasks: ['task1', 'task2']
    });
  });

  it('should return all log lines without truncation', async () => {
    const logs = Array.from({ length: 100 }, (_, i) => `Log line ${i}`);
    mockEndpoints(logs, defaultStatus);

    const result = await getAutomationLogs('http://automation.local:5000');

    expect(result.items).toHaveLength(100);
    expect(result.items[0]).toBe('Log line 0');
    expect(result.items[99]).toBe('Log line 99');
  });

  it('should return empty items and null status on error', async () => {
    mockClient.get.mockRejectedValue(new Error('Service unavailable'));

    const result = await getAutomationLogs('http://automation.local:5000');

    expect(result.sourceUrl).toBe('http://automation.local:5000');
    expect(result.status).toBeNull();
    expect(result.items).toEqual([]);
  });

  it('should handle empty logs array', async () => {
    mockEndpoints([], defaultStatus);

    const result = await getAutomationLogs('http://automation.local:5000');

    expect(result.items).toEqual([]);
    expect(result.status.running).toBe(true);
  });

  it('should create axios client with correct config', async () => {
    mockEndpoints([], defaultStatus);

    await getAutomationLogs('http://automation.local:5000');

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://automation.local:5000',
      timeout: 10000
    });
  });

  it('should fetch both /api/logs and /api/status endpoints', async () => {
    mockEndpoints([], defaultStatus);

    await getAutomationLogs('http://automation.local:5000');

    expect(mockClient.get).toHaveBeenCalledWith('/api/logs');
    expect(mockClient.get).toHaveBeenCalledWith('/api/status');
  });

  it('should handle network timeout', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    mockClient.get.mockRejectedValue(timeoutError);

    const result = await getAutomationLogs('http://automation.local:5000');

    expect(result.sourceUrl).toBe('http://automation.local:5000');
    expect(result.status).toBeNull();
    expect(result.items).toEqual([]);
  });

  it('should default missing status fields gracefully', async () => {
    mockEndpoints(['a log line'], {});

    const result = await getAutomationLogs('http://automation.local:5000');

    expect(result.status.color).toBe('#666666');
    expect(result.status.running).toBe(false);
    expect(result.status.queueCount).toBe(0);
  });
});
