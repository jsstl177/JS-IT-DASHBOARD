const axios = require('axios');
const https = require('https');

async function getProxmoxStatus(baseUrl, username, password, nodeNames = []) {
  try {
    // First, get authentication ticket
    const authResponse = await axios.post(`${baseUrl}/api2/json/access/ticket`, {
      username: username,
      password: password
    }, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }), // For self-signed certs
      timeout: 10000
    });

    const { ticket, CSRFPreventionToken } = authResponse.data.data;

    // Set up authenticated axios instance
    const authAxios = axios.create({
      baseURL: baseUrl,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 10000,
      headers: {
        'Cookie': `PVEAuthCookie=${ticket}`,
        'CSRFPreventionToken': CSRFPreventionToken
      }
    });

    const results = [];

    // If specific nodes provided, check them; otherwise get all nodes
    const nodesToCheck = nodeNames.length > 0 ? nodeNames : await getAllNodes(authAxios);

    for (const nodeName of nodesToCheck) {
      try {
        const nodeStatus = await authAxios.get(`/api2/json/nodes/${nodeName}/status`);
        const qemuStatus = await authAxios.get(`/api2/json/nodes/${nodeName}/qemu`);
        const lxcStatus = await authAxios.get(`/api2/json/nodes/${nodeName}/lxc`);

        results.push({
          node: nodeName,
          status: nodeStatus.data.data,
          vms: qemuStatus.data.data || [],
          containers: lxcStatus.data.data || [],
          link: `${baseUrl}#v1:0:=node%2F${nodeName}`
        });
      } catch (nodeError) {
        console.error(`Error fetching ${nodeName}:`, nodeError.message);
      }
    }

    return results;
  } catch (error) {
    console.error('Proxmox API error:', error.message);
    return [];
  }
}

async function getAllNodes(authAxios) {
  try {
    const response = await authAxios.get('/api2/json/nodes');
    return response.data.data.map(node => node.node);
  } catch (error) {
    console.error('Error getting nodes:', error.message);
    return [];
  }
}

module.exports = { getProxmoxStatus };