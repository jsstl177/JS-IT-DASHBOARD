import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';

function N8NExecutions({ data, sourceUrl }) {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'finished':
        return 'success';
      case 'error':
      case 'failed':
        return 'error';
      case 'running':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card className="n8n-executions-card">
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ fontSize: '36pt', fontWeight: 'bold' }}>
          N8N Workflow History
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', fontSize: '14px' }}>
              Open
            </a>
          )}
        </Typography>
        {data.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No recent executions
          </Typography>
        ) : (
          <List dense>
            {data.slice(0, 10).map((execution) => (
              <ListItem key={execution.id}>
                <ListItemText
                  primary={execution.workflowName || `Workflow ${execution.workflowId}`}
                  secondary={`Started: ${new Date(execution.startedAt).toLocaleString()}`}
                />
                <Chip
                  label={execution.status}
                  color={getStatusColor(execution.status)}
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

export default N8NExecutions;
