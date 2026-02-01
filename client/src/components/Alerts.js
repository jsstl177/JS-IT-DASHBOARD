import React from 'react';
import {
  Card, CardContent, Typography, List, ListItem, ListItemText,
  Chip, Box, ListItemIcon
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const SEVERITY_CONFIG = {
  critical: { color: '#F44336', label: 'Critical' },
  high: { color: '#FF5722', label: 'High' },
  medium: { color: '#FF9800', label: 'Medium' },
  low: { color: '#4CAF50', label: 'Low' },
  info: { color: '#2196F3', label: 'Info' },
};

function getSeverityStyle(severity) {
  const key = (severity || '').toLowerCase();
  return SEVERITY_CONFIG[key] || { color: '#9E9E9E', label: severity || 'N/A' };
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function Alerts({ data, sourceUrl, totalCount }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem' }}>
            Alerts
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: '10px', fontSize: '12px' }}
              >
                Open
              </a>
            )}
          </Typography>
          {totalCount > 0 && (
            <Chip
              label={`${totalCount} active`}
              size="small"
              color="warning"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>

        {data.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No active alerts
          </Typography>
        ) : (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <List dense disablePadding>
              {[...data].sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0)).map((alert) => {
                const sStyle = getSeverityStyle(alert.severity);
                return (
                  <ListItem
                    key={alert.id}
                    component={alert.link ? 'a' : 'li'}
                    href={alert.link || undefined}
                    target={alert.link ? '_blank' : undefined}
                    rel={alert.link ? 'noopener noreferrer' : undefined}
                    sx={{
                      borderLeft: `4px solid ${sStyle.color}`,
                      mb: 0.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: alert.link ? 'pointer' : 'default',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningAmberIcon sx={{ fontSize: 18, color: sStyle.color }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                            {alert.message}
                          </Typography>
                          <Chip
                            label={sStyle.label}
                            size="small"
                            sx={{
                              bgcolor: sStyle.color,
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.65rem',
                              height: 20,
                              flexShrink: 0
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
                          {alert.asset && `Asset: ${alert.asset}`}
                          {alert.policy && ` · Policy: ${alert.policy}`}
                          {alert.status && ` · ${alert.status}`}
                          {alert.createdTime && ` · ${formatTime(alert.createdTime)}`}
                        </Typography>
                      }
                    />
                    {alert.link && (
                      <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5, flexShrink: 0 }} />
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default Alerts;
