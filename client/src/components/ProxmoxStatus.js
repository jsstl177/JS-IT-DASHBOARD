import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StorageIcon from '@mui/icons-material/Storage';

function ProxmoxStatus({ data, sourceUrl }) {
  // Use configured URL or default to the Proxmox node interface
  const proxmoxUrl = sourceUrl || 'https://192.168.177.89:8006';
  const nodeName = 'proxmox1';
  
  // Construct the Proxmox URL with node view
  // URL format: #v1:0:=node/NODENAME:4:5::::8::
  const embedUrl = `${proxmoxUrl}/#v1:0:=node%2F${nodeName}:4:5::::8::`;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        p: 1.5, 
        '&:last-child': { pb: 1.5 },
        height: '100%'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 1 
        }}>
          <Typography 
            variant="h6" 
            component="h2" 
            sx={{ 
              fontSize: '24pt', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <StorageIcon color="primary" />
            Proxmox Status
          </Typography>
        </Box>

        {proxmoxUrl ? (
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 2,
            py: 4
          }}>
            <Typography variant="body1" color="text.secondary" align="center">
              Access your Proxmox cluster directly
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 400 }}>
              Note: You may need to accept the SSL certificate first if using a self-signed certificate.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="large"
              startIcon={<OpenInNewIcon />}
              sx={{ mt: 2 }}
            >
              Open Proxmox
            </Button>
          </Box>
        ) : (
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 2
          }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Proxmox not configured
            </Typography>
            <Typography variant="caption" color="text.secondary" align="center">
              Add Proxmox configuration in Settings to view cluster status
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default ProxmoxStatus;
