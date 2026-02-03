jest.mock('axios', () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn()
  };
  return {
    create: jest.fn(() => instance),
    post: jest.fn(),
    __instance: instance
  };
});

const axios = require('axios');
const { testServiceConnection } = require('../services/connectionTester');

describe('connectionTester', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== Uptime Kuma ==========
  describe('uptime-kuma', () => {
    it('should call GET /api/status-page/everything and return success', async () => {
      axios.__instance.get.mockResolvedValue({ data: { monitors: [] } });

      const result = await testServiceConnection('uptime-kuma', {
        base_url: 'http://uptime.local:3001'
      });

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({ baseURL: 'http://uptime.local:3001', timeout: 5000 })
      );
      expect(axios.__instance.get).toHaveBeenCalledWith('/api/status-page/everything');
      expect(result).toEqual({ success: true, message: 'Uptime Kuma is reachable and responding.' });
    });

    it('should propagate errors for route-level handling', async () => {
      axios.__instance.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(testServiceConnection('uptime-kuma', {
        base_url: 'http://uptime.local:3001'
      })).rejects.toThrow('ECONNREFUSED');
    });
  });

  // ========== SuperOps ==========
  describe('superops', () => {
    it('should POST GraphQL query to SuperOps API and return success', async () => {
      axios.post.mockResolvedValue({
        data: { data: { getStatusList: [{ statusId: '1', name: 'Open' }] } }
      });

      const result = await testServiceConnection('superops', {
        base_url: 'https://mycompany.superops.ai',
        api_key: 'test-key-123'
      });

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.superops.ai/msp',
        expect.objectContaining({
          query: expect.stringContaining('getStatusList')
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key-123',
            'CustomerSubDomain': 'mycompany',
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('mycompany');
    });

    it('should throw on GraphQL errors', async () => {
      axios.post.mockResolvedValue({
        data: { errors: [{ message: 'Unauthorized' }] }
      });

      await expect(testServiceConnection('superops', {
        base_url: 'https://mycompany.superops.ai',
        api_key: 'bad-key'
      })).rejects.toThrow('Unauthorized');
    });

    it('should propagate network errors', async () => {
      axios.post.mockRejectedValue(new Error('Network Error'));

      await expect(testServiceConnection('superops', {
        base_url: 'https://mycompany.superops.ai',
        api_key: 'test-key'
      })).rejects.toThrow('Network Error');
    });
  });

  // ========== Automation Log ==========
  describe('automation-log', () => {
    it('should call GET /logs and return success', async () => {
      axios.__instance.get.mockResolvedValue({ data: { logs: [] } });

      const result = await testServiceConnection('automation-log', {
        base_url: 'http://logs.local:4000'
      });

      expect(axios.__instance.get).toHaveBeenCalledWith('/logs');
      expect(result).toEqual({ success: true, message: 'Automation Log service is reachable and responding.' });
    });
  });

  // ========== N8N ==========
  describe('n8n', () => {
    it('should call GET /rest/executions?limit=1 with X-N8N-API-KEY and return success', async () => {
      axios.__instance.get.mockResolvedValue({ data: { data: [] } });

      const result = await testServiceConnection('n8n', {
        base_url: 'http://n8n.local:5678',
        api_key: 'n8n-api-key'
      });

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://n8n.local:5678',
          timeout: 5000,
          headers: { 'X-N8N-API-KEY': 'n8n-api-key' }
        })
      );
      expect(axios.__instance.get).toHaveBeenCalledWith('/rest/executions', { params: { limit: 1 } });
      expect(result.success).toBe(true);
    });
  });

  // ========== Proxmox ==========
  describe('proxmox', () => {
    it('should test API token authentication successfully', async () => {
      axios.get.mockResolvedValue({ 
        data: { 
          data: [
            { type: 'node', name: 'pve1', online: 1 },
            { type: 'node', name: 'pve2', online: 1 }
          ] 
        } 
      });

      const result = await testServiceConnection('proxmox', {
        base_url: 'https://proxmox.local:8006',
        api_key: 'root@pam!dashboard',
        api_secret: 'secret-token-uuid'
      });

      expect(axios.get).toHaveBeenCalledWith(
        'https://proxmox.local:8006/api2/json/cluster/status',
        expect.objectContaining({
          timeout: 5000,
          headers: {
            'Authorization': 'PVEAPIToken=root@pam!dashboard=secret-token-uuid'
          }
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('authenticated successfully');
      expect(result.message).toContain('2 node');
    });

    it('should test legacy username/password authentication', async () => {
      axios.post.mockResolvedValue({ data: { data: { ticket: 'abc', CSRFPreventionToken: 'xyz' } } });

      const result = await testServiceConnection('proxmox', {
        base_url: 'https://proxmox.local:8006',
        username: 'root@pam',
        password: 'secret'
      });

      expect(axios.post).toHaveBeenCalledWith(
        'https://proxmox.local:8006/api2/json/access/ticket',
        { username: 'root@pam', password: 'secret' },
        expect.objectContaining({ timeout: 5000 })
      );
      expect(result.success).toBe(true);
    });

    it('should propagate API token auth failure', async () => {
      const err = new Error('Request failed with status code 401');
      err.response = { status: 401 };
      axios.get.mockRejectedValue(err);

      await expect(testServiceConnection('proxmox', {
        base_url: 'https://proxmox.local:8006',
        api_key: 'root@pam!dashboard',
        api_secret: 'wrong-token'
      })).rejects.toThrow();
    });

    it('should throw error when neither API token nor credentials provided', async () => {
      await expect(testServiceConnection('proxmox', {
        base_url: 'https://proxmox.local:8006'
      })).rejects.toThrow('requires either API Token');
    });
  });

  // ========== Power BI ==========
  describe('powerbi', () => {
    it('should validate a correct Power BI URL format', async () => {
      const result = await testServiceConnection('powerbi', {
        base_url: 'https://app.powerbi.com/reportEmbed?reportId=abc-123'
      });

      expect(result).toEqual({ success: true, message: 'Power BI embed URL format is valid.' });
    });

    it('should reject for an invalid Power BI URL', async () => {
      await expect(testServiceConnection('powerbi', {
        base_url: 'http://example.com/not-powerbi'
      })).rejects.toThrow('Power BI URL does not match the expected format');
    });

    it('should reject when Power BI URL is empty', async () => {
      await expect(testServiceConnection('powerbi', {
        base_url: ''
      })).rejects.toThrow('Power BI embed URL is not configured');
    });
  });

  // ========== Unknown service ==========
  describe('unknown service', () => {
    it('should throw for an unknown service type', async () => {
      await expect(testServiceConnection('unknown-svc', {})).rejects.toThrow('Unknown service type: unknown-svc');
    });
  });
});
