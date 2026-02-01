jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const axios = require('axios');
const { getOpenTickets, extractSubdomain } = require('../../services/superOps');

describe('SuperOps Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractSubdomain', () => {
    it('should extract subdomain from tenant URL', () => {
      expect(extractSubdomain('https://johnstonesupply-thewinesgroup.superops.ai'))
        .toBe('johnstonesupply-thewinesgroup');
    });

    it('should extract subdomain with trailing slash', () => {
      expect(extractSubdomain('https://mycompany.superops.ai/'))
        .toBe('mycompany');
    });

    it('should return hostname for non-superops URLs', () => {
      expect(extractSubdomain('https://example.com'))
        .toBe('example.com');
    });

    it('should return raw string for invalid URLs', () => {
      expect(extractSubdomain('not-a-url'))
        .toBe('not-a-url');
    });
  });

  describe('getOpenTickets', () => {
    const tenantUrl = 'https://johnstonesupply-thewinesgroup.superops.ai';

    it('should return tickets on successful GraphQL response', async () => {
      axios.post.mockResolvedValue({
        data: {
          data: {
            getTicketList: {
              tickets: [
                {
                  ticketId: '123',
                  displayId: '012025-0001',
                  subject: 'Printer not working',
                  status: 'Open',
                  priority: 'High',
                  createdTime: '2026-01-15T10:00:00',
                  updatedTime: '2026-01-15T12:00:00',
                  technician: { userId: '1', name: 'John Doe' },
                  requester: { userId: '2', name: 'Jane Smith' },
                  client: { name: 'Acme Corp' },
                  site: { name: 'Main Office' }
                }
              ],
              listInfo: { totalCount: 1, hasMore: false }
            }
          }
        }
      });

      const result = await getOpenTickets(tenantUrl, 'test-api-key');

      expect(result.sourceUrl).toBe('https://johnstonesupply-thewinesgroup.superops.ai/servicedesk/tickets');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: '123',
        displayId: '012025-0001',
        title: 'Printer not working',
        status: 'Open',
        priority: 'High',
        createdTime: '2026-01-15T10:00:00',
        updatedTime: '2026-01-15T12:00:00',
        technician: 'John Doe',
        requester: 'Jane Smith',
        client: 'Acme Corp',
        site: 'Main Office',
        link: 'https://johnstonesupply-thewinesgroup.superops.ai/servicedesk/tickets/012025-0001'
      });
      expect(result.totalCount).toBe(1);
    });

    it('should send correct GraphQL request with headers', async () => {
      axios.post.mockResolvedValue({
        data: { data: { getTicketList: { tickets: [], listInfo: { totalCount: 0 } } } }
      });

      await getOpenTickets(tenantUrl, 'my-token');

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.superops.ai/msp',
        expect.objectContaining({
          query: expect.stringContaining('getTicketList'),
          variables: expect.objectContaining({
            input: expect.objectContaining({
              page: 1,
              pageSize: 100,
              condition: {
                attribute: 'status',
                operator: 'notIncludes',
                value: ['Resolved', 'Closed']
              }
            })
          })
        }),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer my-token',
            'CustomerSubDomain': 'johnstonesupply-thewinesgroup',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should handle GraphQL errors', async () => {
      axios.post.mockResolvedValue({
        data: {
          errors: [{ message: 'Unauthorized' }]
        }
      });

      const result = await getOpenTickets(tenantUrl, 'bad-key');

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should handle network errors', async () => {
      axios.post.mockRejectedValue(new Error('Network Error'));

      const result = await getOpenTickets(tenantUrl, 'test-key');

      expect(result.sourceUrl).toBe(tenantUrl);
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should handle empty ticket list', async () => {
      axios.post.mockResolvedValue({
        data: { data: { getTicketList: { tickets: [], listInfo: { totalCount: 0, hasMore: false } } } }
      });

      const result = await getOpenTickets(tenantUrl, 'test-key');

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should handle technician/requester as strings', async () => {
      axios.post.mockResolvedValue({
        data: {
          data: {
            getTicketList: {
              tickets: [{
                ticketId: '1',
                displayId: 'T-001',
                subject: 'Test',
                status: 'Open',
                priority: 'Low',
                createdTime: null,
                updatedTime: null,
                technician: 'Direct Name',
                requester: 'Direct Requester',
                client: 'Direct Client',
                site: null
              }],
              listInfo: { totalCount: 1 }
            }
          }
        }
      });

      const result = await getOpenTickets(tenantUrl, 'test-key');

      expect(result.items[0].technician).toBe('Direct Name');
      expect(result.items[0].requester).toBe('Direct Requester');
      expect(result.items[0].client).toBe('Direct Client');
      expect(result.items[0].site).toBeNull();
    });

    it('should handle missing getTicketList data', async () => {
      axios.post.mockResolvedValue({
        data: { data: {} }
      });

      const result = await getOpenTickets(tenantUrl, 'test-key');

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should strip trailing slash from tenant URL in links', async () => {
      axios.post.mockResolvedValue({
        data: {
          data: {
            getTicketList: {
              tickets: [{
                ticketId: '1',
                displayId: 'T-001',
                subject: 'Test',
                status: 'Open',
                priority: 'Low',
                createdTime: null,
                updatedTime: null,
                technician: null,
                requester: null,
                client: null,
                site: null
              }],
              listInfo: { totalCount: 1 }
            }
          }
        }
      });

      const result = await getOpenTickets('https://mycompany.superops.ai/', 'test-key');

      expect(result.sourceUrl).toBe('https://mycompany.superops.ai/servicedesk/tickets');
      expect(result.items[0].link).toBe('https://mycompany.superops.ai/servicedesk/tickets/T-001');
    });
  });
});
