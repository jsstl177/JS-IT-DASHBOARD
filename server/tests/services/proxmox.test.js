jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const axios = require('axios');
const { getProxmoxStatus, testProxmoxConnection } = require('../../services/proxmox');

describe('Proxmox Service - getProxmoxStatus', () => {
  const mockBaseUrl = 'https://192.168.177.89:8006';
  const mockTokenId = 'root@pam!dashboard';
  const mockTokenSecret = '12345678-1234-1234-1234-123456789abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty items on auth failure', async () => {
    const authError = new Error('Authentication failed');
    authError.response = { status: 401 };
    
    // Create a mock axios instance that rejects
    const mockInstance = {
      get: jest.fn().mockRejectedValue(authError)
    };
    axios.create.mockReturnValue(mockInstance);

    const result = await getProxmoxStatus(
      mockBaseUrl,
      mockTokenId,
      mockTokenSecret
    );

    expect(result.sourceUrl).toBe(mockBaseUrl);
    expect(result.items).toEqual([]);
    expect(result.error).toBeDefined();
    expect(result.error.type).toBe('authentication');
  });

  it('should return cluster data on successful API token auth', async () => {
    // Create a mock axios instance
    const mockInstance = {
      get: jest.fn().mockImplementation((url) => {
        if (url === '/api2/json/cluster/status') {
          return Promise.resolve({
            data: {
              data: [
                { type: 'node', name: 'pve-node1', online: 1, ip: '192.168.1.10' },
                { type: 'node', name: 'pve-node2', online: 1, ip: '192.168.1.11' }
              ]
            }
          });
        } else if (url.includes('/nodes/pve-node1/status')) {
          return Promise.resolve({
            data: {
              data: {
                cpu: 0.25,
                memory: { used: 4096, total: 16384 },
                uptime: 86400,
                swap: { used: 512, total: 2048 }
              }
            }
          });
        } else if (url.includes('/nodes/pve-node1/qemu')) {
          return Promise.resolve({
            data: { data: [{ vmid: 100, name: 'vm1', status: 'running', cpu: 0.05, maxmem: 2147483648 }] }
          });
        } else if (url.includes('/nodes/pve-node1/lxc')) {
          return Promise.resolve({
            data: { data: [{ vmid: 200, name: 'ct1', status: 'running', cpu: 0.02, maxmem: 536870912 }] }
          });
        } else if (url.includes('/nodes/pve-node2/status')) {
          return Promise.resolve({
            data: {
              data: {
                cpu: 0.15,
                memory: { used: 2048, total: 8192 },
                uptime: 43200
              }
            }
          });
        } else if (url.includes('/nodes/pve-node2/qemu') || url.includes('/nodes/pve-node2/lxc')) {
          return Promise.resolve({ data: { data: [] } });
        }
        return Promise.resolve({ data: { data: [] } });
      })
    };
    axios.create.mockReturnValue(mockInstance);

    const result = await getProxmoxStatus(
      mockBaseUrl,
      mockTokenId,
      mockTokenSecret
    );

    expect(result.sourceUrl).toBe(mockBaseUrl);
    expect(result.items).toHaveLength(2);
    expect(result.clusterInfo.totalNodes).toBe(2);
    expect(result.clusterInfo.onlineNodes).toBe(2);
    expect(result.items[0].node).toBe('pve-node1');
    expect(result.items[0].vms).toHaveLength(1);
    expect(result.items[0].containers).toHaveLength(1);
    expect(result.items[0].online).toBe(true);
  });

  it('should create axios instance with API token authorization header', async () => {
    const mockInstance = {
      get: jest.fn().mockResolvedValue({
        data: { data: [{ type: 'node', name: 'node1' }] }
      })
    };
    axios.create.mockReturnValue(mockInstance);

    await getProxmoxStatus(
      mockBaseUrl,
      mockTokenId,
      mockTokenSecret
    );

    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: mockBaseUrl,
      timeout: 15000,
      headers: {
        'Authorization': `PVEAPIToken=${mockTokenId}=${mockTokenSecret}`
      }
    }));
  });

  it('should handle cluster status API failure gracefully', async () => {
    // Cluster status fails, falls back to nodes endpoint
    const mockInstance = {
      get: jest.fn().mockImplementation((url) => {
        if (url === '/api2/json/cluster/status') {
          return Promise.reject(new Error('Cluster API not available'));
        } else if (url === '/api2/json/nodes') {
          return Promise.resolve({
            data: { data: [{ node: 'fallback-node' }] }
          });
        } else if (url.includes('/status')) {
          return Promise.resolve({
            data: { data: { cpu: 0.1, memory: { used: 1024, total: 4096 }, uptime: 3600 } }
          });
        }
        return Promise.resolve({ data: { data: [] } });
      })
    };
    axios.create.mockReturnValue(mockInstance);

    const result = await getProxmoxStatus(
      mockBaseUrl,
      mockTokenId,
      mockTokenSecret
    );

    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should handle individual node errors gracefully', async () => {
    // One node succeeds, one fails
    const mockInstance = {
      get: jest.fn().mockImplementation((url) => {
        if (url === '/api2/json/cluster/status') {
          return Promise.resolve({
            data: {
              data: [
                { type: 'node', name: 'good-node', online: 1 },
                { type: 'node', name: 'bad-node', online: 0 }
              ]
            }
          });
        } else if (url.includes('good-node')) {
          return Promise.resolve({
            data: { data: { cpu: 0.1, memory: { used: 1024, total: 4096 }, uptime: 3600 } }
          });
        } else if (url.includes('bad-node')) {
          return Promise.reject(new Error('Node unreachable'));
        }
        return Promise.resolve({ data: { data: [] } });
      })
    };
    axios.create.mockReturnValue(mockInstance);

    const result = await getProxmoxStatus(
      mockBaseUrl,
      mockTokenId,
      mockTokenSecret
    );

    // Should include both nodes - one with data, one with error state
    expect(result.items).toHaveLength(2);
    const goodNode = result.items.find(n => n.node === 'good-node');
    const badNode = result.items.find(n => n.node === 'bad-node');
    expect(goodNode.online).toBe(true);
    expect(badNode.online).toBe(false);
    expect(badNode.error).toBeDefined();
  });

  it('should handle connection timeout', async () => {
    const timeoutError = new Error('timeout of 15000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    
    const mockInstance = {
      get: jest.fn().mockRejectedValue(timeoutError)
    };
    axios.create.mockReturnValue(mockInstance);

    const result = await getProxmoxStatus(
      mockBaseUrl,
      mockTokenId,
      mockTokenSecret
    );

    expect(result.sourceUrl).toBe(mockBaseUrl);
    expect(result.items).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('should return cluster summary statistics', async () => {
    const mockInstance = {
      get: jest.fn().mockImplementation((url) => {
        if (url === '/api2/json/cluster/status') {
          return Promise.resolve({
            data: {
              data: [
                { type: 'node', name: 'node1', online: 1 },
                { type: 'node', name: 'node2', online: 1 }
              ]
            }
          });
        } else if (url.includes('/qemu')) {
          return Promise.resolve({
            data: { data: [{ vmid: 100 }, { vmid: 101 }] }
          });
        } else if (url.includes('/lxc')) {
          return Promise.resolve({
            data: { data: [{ vmid: 200 }] }
          });
        } else if (url.includes('/status')) {
          return Promise.resolve({
            data: { data: { cpu: 0.1, uptime: 3600 } }
          });
        }
        return Promise.resolve({ data: { data: [] } });
      })
    };
    axios.create.mockReturnValue(mockInstance);

    const result = await getProxmoxStatus(
      mockBaseUrl,
      mockTokenId,
      mockTokenSecret
    );

    expect(result.clusterInfo).toBeDefined();
    expect(result.clusterInfo.totalNodes).toBe(2);
    expect(result.clusterInfo.totalVMs).toBe(4); // 2 VMs per node
    expect(result.clusterInfo.totalContainers).toBe(2); // 1 container per node
  });
});

describe('Proxmox Service - testProxmoxConnection', () => {
  const mockBaseUrl = 'https://192.168.177.89:8006';
  const mockTokenId = 'root@pam!dashboard';
  const mockTokenSecret = '12345678-1234-1234-1234-123456789abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success on valid API token', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          { type: 'node', name: 'pve1', online: 1 }
        ]
      }
    });

    const result = await testProxmoxConnection(mockBaseUrl, mockTokenId, mockTokenSecret);

    expect(result.success).toBe(true);
    expect(result.message).toContain('authenticated successfully');
    expect(result.message).toContain('1 node');
  });

  it('should throw on 401 authentication error', async () => {
    const error = new Error('Unauthorized');
    error.response = { status: 401 };
    axios.get.mockRejectedValue(error);

    await expect(testProxmoxConnection(mockBaseUrl, mockTokenId, mockTokenSecret))
      .rejects.toThrow('Authentication failed');
  });

  it('should throw on 403 permission error', async () => {
    const error = new Error('Forbidden');
    error.response = { status: 403 };
    axios.get.mockRejectedValue(error);

    await expect(testProxmoxConnection(mockBaseUrl, mockTokenId, mockTokenSecret))
      .rejects.toThrow('Permission denied');
  });

  it('should throw on connection refused', async () => {
    const error = new Error('Connection refused');
    error.code = 'ECONNREFUSED';
    axios.get.mockRejectedValue(error);

    await expect(testProxmoxConnection(mockBaseUrl, mockTokenId, mockTokenSecret))
      .rejects.toThrow('Connection refused');
  });
});
