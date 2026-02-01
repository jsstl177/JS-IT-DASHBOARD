import React, { useState } from 'react';
import {
  Card, CardContent, Typography, List, ListItem, ListItemText,
  Chip, Box, ListItemIcon, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Alert, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import axios from 'axios';

const PRIORITY_CONFIG = {
  critical: { color: '#F44336', label: 'Critical' },
  high: { color: '#FF5722', label: 'High' },
  urgent: { color: '#FF5722', label: 'Urgent' },
  medium: { color: '#FF9800', label: 'Medium' },
  low: { color: '#4CAF50', label: 'Low' },
};

function getPriorityStyle(priority) {
  const key = (priority || '').toLowerCase();
  return PRIORITY_CONFIG[key] || { color: '#9E9E9E', label: priority || 'N/A' };
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function OpenTickets({ data, sourceUrl, totalCount }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSend = async () => {
    if (!customer.trim() || !description.trim()) {
      setFeedback({ severity: 'error', message: 'Customer and description are required.' });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const res = await axios.post('/api/dashboard/create-case', { customer: customer.trim(), description: description.trim() });
      const ticket = res.data.ticket;
      setFeedback({
        severity: 'success',
        message: ticket?.displayId
          ? `Case #${ticket.displayId} created.`
          : 'Case created successfully.',
        link: ticket?.link
      });
      setCustomer('');
      setDescription('');
    } catch (err) {
      setFeedback({ severity: 'error', message: err.response?.data?.error || 'Failed to create case.' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setDialogOpen(false);
      setCustomer('');
      setDescription('');
      setFeedback(null);
    }
  };

  return (
    <Card className="open-tickets-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem' }}>
            Open Cases
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Create Case
            </Button>
            {totalCount > 0 && (
              <Chip
                label={`${totalCount} total`}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        {/* Ticket list */}
        {data.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No open tickets
          </Typography>
        ) : (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <List dense disablePadding>
              {data.map((ticket) => {
                const pStyle = getPriorityStyle(ticket.priority);
                return (
                  <ListItem
                    key={ticket.id || ticket.displayId}
                    component={ticket.link ? 'a' : 'li'}
                    href={ticket.link || undefined}
                    target={ticket.link ? '_blank' : undefined}
                    rel={ticket.link ? 'noopener noreferrer' : undefined}
                    sx={{
                      borderLeft: `4px solid ${pStyle.color}`,
                      mb: 0.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: ticket.link ? 'pointer' : 'default',
                      '&:hover': {
                        bgcolor: 'action.selected',
                        ...(ticket.link && { textDecoration: 'underline' })
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ConfirmationNumberIcon sx={{ fontSize: 18, color: pStyle.color }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                            {ticket.title}
                          </Typography>
                          <Chip
                            label={pStyle.label}
                            size="small"
                            sx={{
                              bgcolor: pStyle.color,
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
                          {ticket.displayId && `#${ticket.displayId}`}
                          {ticket.status && ` · ${ticket.status}`}
                          {ticket.technician && ` · ${ticket.technician}`}
                          {ticket.requester && ` · from ${ticket.requester}`}
                          {ticket.createdTime && ` · ${formatTime(ticket.createdTime)}`}
                        </Typography>
                      }
                    />
                    {ticket.link && (
                      <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5, flexShrink: 0 }} />
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </CardContent>

      {/* Create Case Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create Case</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Customer"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            margin="dense"
            disabled={sending}
          />
          <TextField
            fullWidth
            label="Describe Issue"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="dense"
            multiline
            rows={4}
            disabled={sending}
          />
          {feedback && (
            <Alert severity={feedback.severity} sx={{ mt: 1 }}>
              {feedback.message}
              {feedback.link && (
                <>
                  {' '}
                  <a href={feedback.link} target="_blank" rel="noopener noreferrer">
                    Open in SuperOps
                  </a>
                </>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={sending}>Cancel</Button>
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={sending}
            startIcon={sending ? <CircularProgress size={16} /> : null}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default OpenTickets;
