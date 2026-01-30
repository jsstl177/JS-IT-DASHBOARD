jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const axios = require('axios');
const { getOpenTickets } = require('../../services/superOps');

// Set up mock axios client
const mockClient = {
  get: jest.fn(),
  post: jest.fn()
};
axios.create.mockReturnValue(mockClient);

describe('SuperOps Service - getOpenTickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue(mockClient);
  });

  it('should return sourceUrl and items on successful fetch', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        tickets: [
          {
            id: 101,
            title: 'Printer broken',
            status: 'open',
            priority: 'high',
            created_at: '2025-01-01',
            updated_at: '2025-01-02',
            assignee: 'admin'
          }
        ]
      }
    });

    const result = await getOpenTickets('https://superops.example.com', 'api-key-123');

    expect(result.sourceUrl).toBe('https://superops.example.com/ticket');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 101,
      title: 'Printer broken',
      status: 'open',
      priority: 'high',
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
      assignee: 'admin',
      link: 'https://superops.example.com/ticket/101'
    });
  });

  it('should handle tickets in response.data.tickets format', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        tickets: [
          { id: 1, title: 'Ticket 1', status: 'open', priority: 'low', created_at: '2025-01-01', updated_at: '2025-01-01', assignee: 'user1' },
          { id: 2, title: 'Ticket 2', status: 'open', priority: 'medium', created_at: '2025-01-02', updated_at: '2025-01-02', assignee: 'user2' }
        ]
      }
    });

    const result = await getOpenTickets('https://superops.example.com', 'api-key-123');

    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe(1);
    expect(result.items[1].id).toBe(2);
  });

  it('should handle tickets directly in response.data (array fallback)', async () => {
    mockClient.get.mockResolvedValue({
      data: [
        { id: 1, subject: 'Network down', status: 'open', priority: 'critical', created_at: '2025-01-01', updated_at: '2025-01-01', assignee: 'admin' }
      ]
    });

    const result = await getOpenTickets('https://superops.example.com', 'api-key-123');

    expect(result.items).toHaveLength(1);
    // Uses subject as title fallback
    expect(result.items[0].title).toBe('Network down');
  });

  it('should use subject as title fallback', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        tickets: [
          { id: 1, subject: 'Subject Field', status: 'open', priority: 'low', created_at: '2025-01-01', updated_at: '2025-01-01', assignee: null }
        ]
      }
    });

    const result = await getOpenTickets('https://superops.example.com', 'api-key-123');

    expect(result.items[0].title).toBe('Subject Field');
  });

  it('should return empty items on error', async () => {
    mockClient.get.mockRejectedValue(new Error('API Error'));

    const result = await getOpenTickets('https://superops.example.com', 'api-key-123');

    expect(result.sourceUrl).toBe('https://superops.example.com');
    expect(result.items).toEqual([]);
  });

  it('should create axios client with correct config', async () => {
    mockClient.get.mockResolvedValue({ data: { tickets: [] } });

    await getOpenTickets('https://superops.example.com', 'my-api-key');

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://superops.example.com',
      timeout: 10000,
      headers: {
        'Authorization': 'Bearer my-api-key',
        'Content-Type': 'application/json'
      }
    });
  });

  it('should pass status=open as query param', async () => {
    mockClient.get.mockResolvedValue({ data: { tickets: [] } });

    await getOpenTickets('https://superops.example.com', 'api-key-123');

    expect(mockClient.get).toHaveBeenCalledWith('/api/tickets', {
      params: { status: 'open' }
    });
  });

  it('should generate correct link per ticket', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        tickets: [
          { id: 42, title: 'Test', status: 'open', priority: 'low', created_at: '2025-01-01', updated_at: '2025-01-01', assignee: null }
        ]
      }
    });

    const result = await getOpenTickets('https://superops.example.com', 'api-key-123');

    expect(result.items[0].link).toBe('https://superops.example.com/ticket/42');
  });
});
