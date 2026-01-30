jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const axios = require('axios');
const { getWorkflowExecutions } = require('../../services/n8n');

// Set up mock axios client
const mockClient = {
  get: jest.fn(),
  post: jest.fn()
};
axios.create.mockReturnValue(mockClient);

describe('N8N Service - getWorkflowExecutions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue(mockClient);
  });

  it('should return sourceUrl and items on successful fetch', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        data: [
          {
            id: '1',
            workflowId: 'wf-1',
            workflowName: 'Daily Backup',
            status: 'success',
            startedAt: '2025-01-01T00:00:00Z',
            stoppedAt: '2025-01-01T00:05:00Z',
            mode: 'trigger'
          },
          {
            id: '2',
            workflowId: 'wf-2',
            workflowName: 'Email Notifications',
            status: 'error',
            startedAt: '2025-01-01T01:00:00Z',
            stoppedAt: '2025-01-01T01:01:00Z',
            mode: 'manual'
          }
        ]
      }
    });

    const result = await getWorkflowExecutions('https://n8n.local', 'n8n-api-key');

    expect(result.sourceUrl).toBe('https://n8n.local');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      id: '1',
      workflowId: 'wf-1',
      workflowName: 'Daily Backup',
      status: 'success',
      startedAt: '2025-01-01T00:00:00Z',
      stoppedAt: '2025-01-01T00:05:00Z',
      mode: 'trigger',
      link: 'https://n8n.local/workflow/wf-1/executions/1'
    });
    expect(result.items[1]).toEqual({
      id: '2',
      workflowId: 'wf-2',
      workflowName: 'Email Notifications',
      status: 'error',
      startedAt: '2025-01-01T01:00:00Z',
      stoppedAt: '2025-01-01T01:01:00Z',
      mode: 'manual',
      link: 'https://n8n.local/workflow/wf-2/executions/2'
    });
  });

  it('should return empty items on error', async () => {
    mockClient.get.mockRejectedValue(new Error('Network error'));

    const result = await getWorkflowExecutions('https://n8n.local', 'n8n-api-key');

    expect(result.sourceUrl).toBe('https://n8n.local');
    expect(result.items).toEqual([]);
  });

  it('should handle malformed response (missing data.data)', async () => {
    mockClient.get.mockResolvedValue({
      data: {}
    });

    const result = await getWorkflowExecutions('https://n8n.local', 'n8n-api-key');

    expect(result.sourceUrl).toBe('https://n8n.local');
    expect(result.items).toEqual([]);
  });

  it('should handle null data.data', async () => {
    mockClient.get.mockResolvedValue({
      data: { data: null }
    });

    const result = await getWorkflowExecutions('https://n8n.local', 'n8n-api-key');

    expect(result.items).toEqual([]);
  });

  it('should handle empty executions array', async () => {
    mockClient.get.mockResolvedValue({
      data: { data: [] }
    });

    const result = await getWorkflowExecutions('https://n8n.local', 'n8n-api-key');

    expect(result.sourceUrl).toBe('https://n8n.local');
    expect(result.items).toEqual([]);
  });

  it('should create axios client with correct config', async () => {
    mockClient.get.mockResolvedValue({ data: { data: [] } });

    await getWorkflowExecutions('https://n8n.local', 'my-n8n-key');

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://n8n.local',
      timeout: 10000,
      headers: { 'X-N8N-API-KEY': 'my-n8n-key' }
    });
  });

  it('should request with limit=20', async () => {
    mockClient.get.mockResolvedValue({ data: { data: [] } });

    await getWorkflowExecutions('https://n8n.local', 'key');

    expect(mockClient.get).toHaveBeenCalledWith('/rest/executions', {
      params: { limit: 20 }
    });
  });

  it('should construct correct link for each execution', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        data: [
          {
            id: '99',
            workflowId: 'wf-abc',
            workflowName: 'Test',
            status: 'success',
            startedAt: null,
            stoppedAt: null,
            mode: 'trigger'
          }
        ]
      }
    });

    const result = await getWorkflowExecutions('https://n8n.local', 'key');

    expect(result.items[0].link).toBe('https://n8n.local/workflow/wf-abc/executions/99');
  });
});
