jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const axios = require('axios');
const { getProxmoxStatus } = require('../../services/proxmox');

describe('Proxmox Service - getProxmoxStatus', () => {
  let mockAuthClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the authenticated axios instance created after login
    mockAuthClient = {
      get: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(mockAuthClient);
  });

  it('should return empty items on auth failure', async () => {
    axios.post.mockRejectedValue(new Error('Authentication failed'));

    const result = await getProxmoxStatus(
      'https://proxmox.local:8006',
      'root@pam',
      'wrongpassword',
      ['node1']
    );

    expect(result.sourceUrl).toBe('https://proxmox.local:8006');
    expect(result.items).toEqual([]);
  });

  it('should return sourceUrl and items on success', async () => {
    // Mock successful auth
    axios.post.mockResolvedValue({
      data: {
        data: {
          ticket: 'PVE:auth-ticket-123',
          CSRFPreventionToken: 'csrf-token-abc'
        }
      }
    });

    // Mock node status, qemu, and lxc calls
    mockAuthClient.get.mockImplementation((url) => {
      if (url.includes('/status')) {
        return Promise.resolve({
          data: { data: { cpu: 0.25, memory: { used: 4096, total: 16384 }, uptime: 86400 } }
        });
      } else if (url.includes('/qemu')) {
        return Promise.resolve({
          data: { data: [{ vmid: 100, name: 'vm1', status: 'running' }] }
        });
      } else if (url.includes('/lxc')) {
        return Promise.resolve({
          data: { data: [{ vmid: 200, name: 'ct1', status: 'running' }] }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const result = await getProxmoxStatus(
      'https://proxmox.local:8006',
      'root@pam',
      'password',
      ['node1']
    );

    expect(result.sourceUrl).toBe('https://proxmox.local:8006');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].node).toBe('node1');
    expect(result.items[0].vms).toHaveLength(1);
    expect(result.items[0].containers).toHaveLength(1);
    expect(result.items[0].link).toBe('https://proxmox.local:8006#v1:0:=node%2Fnode1');
  });

  it('should create axios instance with auth cookies after login', async () => {
    axios.post.mockResolvedValue({
      data: {
        data: {
          ticket: 'PVE:ticket-value',
          CSRFPreventionToken: 'csrf-value'
        }
      }
    });

    mockAuthClient.get.mockResolvedValue({ data: { data: [] } });

    await getProxmoxStatus(
      'https://proxmox.local:8006',
      'root@pam',
      'password',
      ['node1']
    );

    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://proxmox.local:8006',
      timeout: 10000,
      headers: {
        'Cookie': 'PVEAuthCookie=PVE:ticket-value',
        'CSRFPreventionToken': 'csrf-value'
      }
    }));
  });

  it('should fetch all nodes when no nodeNames provided', async () => {
    axios.post.mockResolvedValue({
      data: {
        data: {
          ticket: 'ticket',
          CSRFPreventionToken: 'csrf'
        }
      }
    });

    mockAuthClient.get.mockImplementation((url) => {
      if (url === '/api2/json/nodes') {
        return Promise.resolve({
          data: { data: [{ node: 'auto-node1' }, { node: 'auto-node2' }] }
        });
      } else if (url.includes('/status')) {
        return Promise.resolve({ data: { data: { cpu: 0.1 } } });
      } else if (url.includes('/qemu')) {
        return Promise.resolve({ data: { data: [] } });
      } else if (url.includes('/lxc')) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const result = await getProxmoxStatus(
      'https://proxmox.local:8006',
      'root@pam',
      'password',
      []
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0].node).toBe('auto-node1');
    expect(result.items[1].node).toBe('auto-node2');
  });

  it('should handle individual node errors gracefully', async () => {
    axios.post.mockResolvedValue({
      data: {
        data: {
          ticket: 'ticket',
          CSRFPreventionToken: 'csrf'
        }
      }
    });

    let callCount = 0;
    mockAuthClient.get.mockImplementation((url) => {
      // First node succeeds, second fails
      if (url.includes('node1') && url.includes('/status')) {
        return Promise.resolve({ data: { data: { cpu: 0.1 } } });
      } else if (url.includes('node1') && url.includes('/qemu')) {
        return Promise.resolve({ data: { data: [] } });
      } else if (url.includes('node1') && url.includes('/lxc')) {
        return Promise.resolve({ data: { data: [] } });
      } else if (url.includes('node2')) {
        return Promise.reject(new Error('Node unreachable'));
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const result = await getProxmoxStatus(
      'https://proxmox.local:8006',
      'root@pam',
      'password',
      ['node1', 'node2']
    );

    // node1 succeeded, node2 failed silently
    expect(result.items).toHaveLength(1);
    expect(result.items[0].node).toBe('node1');
  });

  it('should handle connection timeout', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    axios.post.mockRejectedValue(timeoutError);

    const result = await getProxmoxStatus(
      'https://proxmox.local:8006',
      'root@pam',
      'password',
      ['node1']
    );

    expect(result.sourceUrl).toBe('https://proxmox.local:8006');
    expect(result.items).toEqual([]);
  });
});
