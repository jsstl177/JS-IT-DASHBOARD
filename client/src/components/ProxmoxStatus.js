import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';

function ProxmoxStatus({ data, sourceUrl }) {
  return (
    <Card className="proxmox-status-card">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Proxmox Status
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', fontSize: '14px' }}>
              Open
            </a>
          )}
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
