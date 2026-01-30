import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText } from '@mui/material';

function AutomationLogs({ data, sourceUrl }) {
  return (
    <Card className="automation-logs-card">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Automation Log
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', fontSize: '14px' }}>
              Open
            </a>
          )}
        </Typography>
        {data.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No recent logs
          </Typography>
        ) : (
          <List dense>
            {data.map((log) => (
              <ListItem key={log.id}>
                <ListItemText
                  primary={`${log.level}: ${log.message}`}
                  secondary={new Date(log.timestamp).toLocaleString()}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export default AutomationLogs;
