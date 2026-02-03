const axios = require('axios');
const https = require('https');
const logger = require('../utils/logger');

/**
 * Get Proxmox cluster status using API Token authentication
 * Token format: PVEAPIToken=USER@REALM!TOKENID=UUID
 * 
 * @param {string} baseUrl - Proxmox API base URL (e.g., https://192.168.177.89:8006)
 * @param {string} tokenId - API Token ID (e.g., root@pam!dashboard or user@pve!tokenid)
 * @param {string} tokenSecret - API Token Secret (UUID)
 * @returns {Promise<{sourceUrl: string, items: Array}>}
 */
async function getProxmoxStatus(baseUrl, tokenId, tokenSecret) {
  try {
    // Handle self-signed certificates for local Proxmox installations
    const httpsAgent = new https.Agent({ 
      rejectUnauthorized: false,
      // Additional options for compatibility with various SSL configurations
      secureProtocol: 'TLSv1_2_method'
    });

    // Build API token authentication header
    // Format: PVEAPIToken=USER@REALM!TOKENID=UUID
    const apiToken = `PVEAPIToken=${tokenId}=${tokenSecret}`;

    // Set up authenticated axios instance
    const authAxios = axios.create({
      baseURL: baseUrl,
      httpsAgent,
      timeout: 15000, // Increased timeout for cluster operations
      headers: {
        'Authorization': apiToken
      }
    });

    const results = [];
    let clusterNodes = [];

    // Fetch cluster status to discover all nodes
    try {
      const clusterResponse = await authAxios.get('/api2/json/cluster/status');
      const clusterData = clusterResponse.data.data || [];
      
      // Filter for nodes only (type === 'node')
      clusterNodes = clusterData
        .filter(item => item.type === 'node')
        .map(node => ({
          name: node.name || node.node,
          online: node.online === 1 || node.online === true,
          ip: node.ip
        }));
      
      logger.info(`Discovered ${clusterNodes.length} nodes in Proxmox cluster`, { 
        service: 'proxmox', 
        nodes: clusterNodes.map(n => n.name) 
      });
    } catch (clusterError) {
      logger.warn('Failed to fetch cluster status, will try individual node discovery', { 
        service: 'proxmox', 
        error: clusterError.message 
      });
      // Fallback: try to get nodes from /nodes endpoint
      try {
        const nodesResponse = await authAxios.get('/api2/json/nodes');
        clusterNodes = (nodesResponse.data.data || []).map(node => ({
          name: node.node,
          online: true, // Assume online if listed
          ip: null
        }));
      } catch (nodesError) {
        logger.error('Failed to discover nodes', { service: 'proxmox', error: nodesError.message });
      }
    }

    // Fetch detailed status for each node
    for (const clusterNode of clusterNodes) {
      const nodeName = clusterNode.name;
      
      try {
        // Fetch all node data in parallel
        const [nodeStatus, qemuStatus, lxcStatus, storageStatus, servicesStatus, networkStatus, rrdData] = await Promise.allSettled([
          authAxios.get(`/api2/json/nodes/${nodeName}/status`).catch(e => ({ status: 'rejected', reason: e })),
          authAxios.get(`/api2/json/nodes/${nodeName}/qemu`).catch(e => ({ status: 'rejected', reason: e })),
          authAxios.get(`/api2/json/nodes/${nodeName}/lxc`).catch(e => ({ status: 'rejected', reason: e })),
          authAxios.get(`/api2/json/nodes/${nodeName}/storage`).catch(e => ({ status: 'rejected', reason: e })),
          authAxios.get(`/api2/json/nodes/${nodeName}/services`).catch(e => ({ status: 'rejected', reason: e })),
          authAxios.get(`/api2/json/nodes/${nodeName}/network`).catch(e => ({ status: 'rejected', reason: e })),
          authAxios.get(`/api2/json/nodes/${nodeName}/rrddata`, { params: { timeframe: 'hour' } }).catch(e => ({ status: 'rejected', reason: e })),
        ]);

        // Extract data from fulfilled promises
        const getData = (result, defaultValue = []) => {
          if (result.status === 'fulfilled' && result.value.data) {
            return result.value.data.data || defaultValue;
          }
          return defaultValue;
        };

        const statusData = getData(nodeStatus, {});
        const vms = getData(qemuStatus, []);
        const containers = getData(lxcStatus, []);
        const storage = getData(storageStatus, []);
        const services = getData(servicesStatus, []);
        const network = getData(networkStatus, []);
        const rrdHistory = getData(rrdData, []);

        // Calculate swap usage if available
        const swapTotal = statusData.swap?.total || statusData.swaptotal || 0;
        const swapUsed = statusData.swap?.used || statusData.swapused || 0;
        
        // Get latest RRD data for disk and network I/O
        const latestRrd = rrdHistory.length > 0 
          ? rrdHistory[rrdHistory.length - 1] 
          : {};

        // Determine if node is online based on uptime
        const isOnline = !!statusData.uptime;

        results.push({
          node: nodeName,
          online: isOnline,
          status: {
            ...statusData,
            swap: {
              total: swapTotal,
              used: swapUsed,
              free: swapTotal - swapUsed
            }
          },
          vms: vms,
          containers: containers,
          storage: storage,
          services: services,
          network: network,
          metrics: {
            diskRead: latestRrd.diskread || 0,
            diskWrite: latestRrd.diskwrite || 0,
            netIn: latestRrd.netin || 0,
            netOut: latestRrd.netout || 0,
            cpu: latestRrd.cpu || statusData.cpu || 0,
            memory: latestRrd.mem || statusData.memory?.used || 0,
            maxMemory: latestRrd.maxmem || statusData.memory?.total || 0
          },
          rrdHistory: rrdHistory,
          link: `${baseUrl}/#v1:0:=node%2F${nodeName}:4:5::::8::`,
          lastUpdated: new Date().toISOString()
        });

        logger.debug(`Successfully fetched data for node ${nodeName}`, { 
          service: 'proxmox', 
          node: nodeName,
          vms: vms.length,
          containers: containers.length
        });

      } catch (nodeError) {
        logger.error(`Error fetching Proxmox node ${nodeName}`, { 
          service: 'proxmox', 
          node: nodeName, 
          error: nodeError.message 
        });
        
        // Add node with error state
        results.push({
          node: nodeName,
          online: false,
          error: nodeError.message,
          status: {},
          vms: [],
          containers: [],
          storage: [],
          services: [],
          network: [],
          metrics: {},
          link: `${baseUrl}/#v1:0:=node%2F${nodeName}:4:5::::8::`,
          lastUpdated: new Date().toISOString()
        });
      }
    }

    return { 
      sourceUrl: baseUrl, 
      items: results,
      clusterInfo: {
        totalNodes: clusterNodes.length,
        onlineNodes: results.filter(r => r.online).length,
        totalVMs: results.reduce((sum, r) => sum + (r.vms?.length || 0), 0),
        totalContainers: results.reduce((sum, r) => sum + (r.containers?.length || 0), 0)
      }
    };

  } catch (error) {
    logger.error('Proxmox API connection error', { 
      service: 'proxmox', 
      error: error.message,
      code: error.code 
    });
    
    // Return error state that UI can handle gracefully
    return { 
      sourceUrl: baseUrl, 
      items: [],
      error: {
        message: error.message,
        code: error.code,
        type: error.response?.status === 401 ? 'authentication' : 'connection'
      }
    };
  }
}

/**
 * Test Proxmox API token authentication
 * @param {string} baseUrl - Proxmox API base URL
 * @param {string} tokenId - API Token ID
 * @param {string} tokenSecret - API Token Secret
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testProxmoxConnection(baseUrl, tokenId, tokenSecret) {
  try {
    const httpsAgent = new https.Agent({ 
      rejectUnauthorized: false,
      secureProtocol: 'TLSv1_2_method'
    });

    const apiToken = `PVEAPIToken=${tokenId}=${tokenSecret}`;

    const response = await axios.get(`${baseUrl}/api2/json/cluster/status`, {
      httpsAgent,
      timeout: 5000,
      headers: {
        'Authorization': apiToken
      }
    });

    if (response.data && response.data.data) {
      const nodes = response.data.data.filter(item => item.type === 'node');
      return { 
        success: true, 
        message: `Proxmox API authenticated successfully. Found ${nodes.length} node(s) in cluster.` 
      };
    }

    return { 
      success: true, 
      message: 'Proxmox API authenticated successfully.' 
    };

  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error('Authentication failed. Check your API Token ID and Secret.');
      } else if (status === 403) {
        throw new Error('Permission denied. Ensure the API token has sufficient privileges.');
      }
      throw new Error(`API returned HTTP ${status}: ${error.response.data?.message || error.message}`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection refused. Verify Proxmox is running and the URL is correct.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Host not found. Check the Proxmox URL for typos.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Connection timed out. The Proxmox host may be unreachable.');
    }
    
    throw new Error(`Connection failed: ${error.message}`);
  }
}

module.exports = { 
  getProxmoxStatus,
  testProxmoxConnection
};
