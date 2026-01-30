import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';

function OpenTickets({ data, sourceUrl }) {
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Card className="open-tickets-card">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Open Cases
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', fontSize: '14px' }}>
              Open
            </a>
          )}
        </Typography>
        {data.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No open tickets
          </Typography>
        ) : (
          <List dense>
            {data.slice(0, 10).map((ticket) => (
              <ListItem key={ticket.id}>
                <ListItemText
                  primary={ticket.title}
                  secondary={`Priority: ${ticket.priority || 'N/A'} | Status: ${ticket.status}`}
                />
                <Chip
                  label={ticket.priority || 'N/A'}
                  color={getPriorityColor(ticket.priority)}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        )}
        {data.length > 10 && (
          <Typography variant="body2" color="textSecondary" style={{ marginTop: '10px' }}>
            And {data.length - 10} more...
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default OpenTickets;
