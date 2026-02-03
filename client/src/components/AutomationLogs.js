import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

function getLogLineColor(line) {
  if (/ - WARNING - /.test(line)) return '#FFC107';
  if (/ - ERROR - /.test(line)) return '#F44336';
  if (/ - CRITICAL - /.test(line)) return '#F44336';
  return '#FFFFFF';
}

function AutomationLogs({ data, status, sourceUrl }) {
  const isRunning = status && status.running;
  const statusColor = status ? status.color : '#666666';

  return (
    <Card className="automation-logs-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Status bar */}
      <Box sx={{ height: 8, width: '100%', bgcolor: statusColor, flexShrink: 0 }} />

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: '24pt', fontWeight: 'bold' }}>
            Automation Log
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
          {status && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: statusColor,
                  flexShrink: 0
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {isRunning ? 'Running' : 'Stopped'}
                {status.queueCount > 0 && ` \u00B7 ${status.queueCount} queued`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* File queue counts */}
        {status && status.fileCounts && (
          <Box sx={{ display: 'flex', gap: 2, mb: 1, fontSize: '12px' }}>
            <Typography variant="caption" sx={{ color: '#00BCD4', fontWeight: 600 }}>
              New Accounts: {status.fileCounts.new_accounts}
            </Typography>
            <Typography variant="caption" sx={{ color: '#FF9800', fontWeight: 600 }}>
              PO Updates: {status.fileCounts.purchasing_po}
            </Typography>
          </Box>
        )}

        {/* Log content */}
        {data.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No logs available
          </Typography>
        ) : (
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              bgcolor: '#1E1E1E',
              borderRadius: 1,
              p: 1.5,
              fontFamily: "'Consolas', 'Menlo', monospace",
              fontSize: '11px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {data.map((line, i) => (
              <div key={i} style={{ color: getLogLineColor(line) }}>
                {line}
              </div>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default AutomationLogs;
