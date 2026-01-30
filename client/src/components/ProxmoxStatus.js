import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';

function ProxmoxStatus({ data }) {
  return (
    <Card className="proxmox-status-card">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Proxmox Status
          <a href="https://192.168.177.89:8006/#v1:0:=node%2Fproxmox1:4:5::::8::" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', fontSize: '14px' }}>
            🔗
          </a>
        </Typography>
        {data.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No Proxmox data available
          </Typography>
        ) : (
          <List dense>
            {data.map((node) => (
              <ListItem key={node.node}>
                <ListItemText
                  primary={`Node: ${node.node}`}
                  secondary={`VMs: ${node.vms?.length || 0} | Containers: ${node.containers?.length || 0}`}
                />
                <Chip
                  label={node.status?.online ? 'Online' : 'Offline'}
                  color={node.status?.online ? 'success' : 'error'}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export default ProxmoxStatus;