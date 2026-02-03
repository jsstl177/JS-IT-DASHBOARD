import React from 'react';
import {
  Card, CardContent, Typography, List, ListItem, ListItemText,
  ListItemIcon, Chip, Box
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import BuildIcon from '@mui/icons-material/Build';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const STATUS_CONFIG = {
  down: { label: 'Down', color: 'error', icon: ErrorIcon },
  maintenance: { label: 'Maintenance', color: 'info', icon: BuildIcon },
  pending: { label: 'Pending', color: 'warning', icon: HelpOutlineIcon },
  unknown: { label: 'Unknown', color: 'warning', icon: HelpOutlineIcon }
};

function NetworkStatus({ data, sourceUrl, totalMonitors }) {
  const allOperational = data.length === 0;

  return (
    <Card className="network-status-card" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ fontSize: '36pt', fontWeight: 'bold' }}>
          Network Status
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '10px', fontSize: '14px' }}
            >
              Open
            </a>
          )}
        </Typography>

        {allOperational ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: 'success.main',
              color: 'success.contrastText',
              borderRadius: 1,
              p: 2,
              mt: 1
            }}
          >
            <CheckCircleIcon fontSize="large" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                All Systems Operational
              </Typography>
              {totalMonitors > 0 && (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {totalMonitors} monitor{totalMonitors !== 1 ? 's' : ''} healthy
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'error.main',
                color: 'error.contrastText',
                borderRadius: 1,
                px: 2,
                py: 1,
                mb: 1
              }}
            >
              <ErrorIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {data.length} issue{data.length !== 1 ? 's' : ''} detected
                {totalMonitors > 0 && ` — ${totalMonitors - data.length} of ${totalMonitors} operational`}
              </Typography>
            </Box>
            <List dense sx={{ overflow: 'auto' }}>
              {data.map((item) => {
                const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.unknown;
                const StatusIcon = cfg.icon;
                return (
                  <ListItem
                    key={item.id}
                    sx={{
                      bgcolor: 'error.50',
                      borderLeft: '4px solid',
                      borderColor: `${cfg.color}.main`,
                      borderRadius: 1,
                      mb: 0.5
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: `${cfg.color}.main` }}>
                      <StatusIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      secondary={
                        item.uptime != null
                          ? `Uptime: ${(item.uptime * 100).toFixed(1)}%`
                          : null
                      }
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                    <Chip
                      label={cfg.label}
                      color={cfg.color}
                      size="small"
                      variant="filled"
                    />
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default NetworkStatus;
