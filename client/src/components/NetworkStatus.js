import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';

function NetworkStatus({ data, sourceUrl }) {
  return (
    <Card className="network-status-card">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Network Status
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', fontSize: '14px' }}>
              Open
            </a>
          )}
        </Typography>
        {data.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            All systems operational
          </Typography>
        ) : (
          <List dense>
            {data.map((item) => (
              <ListItem key={item.id}>
                <ListItemText
                  primary={item.name}
                  secondary={`Status: ${item.status}`}
                />
                <Chip
                  label={item.status}
                  color={item.status === 'down' ? 'error' : 'warning'}
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

export default NetworkStatus;
