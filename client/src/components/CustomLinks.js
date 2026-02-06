/**
 * @fileoverview Custom quick-access links component.
 * Allows users to create, edit, and delete personal bookmarks displayed
 * as cards on the dashboard. Links are stored per-user in the database.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Typography,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import axios from 'axios';

const CustomLinks = ({ data = [] }) => {
  const [links, setLinks] = useState(data);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [formData, setFormData] = useState({ label: '', url: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLinks(data);
  }, [data]);

  const handleOpenDialog = (link = null) => {
    if (link) {
      setEditingLink(link);
      setFormData({ label: link.label, url: link.url });
    } else {
      setEditingLink(null);
      setFormData({ label: '', url: '' });
    }
    setDialogOpen(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLink(null);
    setFormData({ label: '', url: '' });
    setError(null);
  };

  const handleSubmit = async () => {
    if (!formData.label.trim() || !formData.url.trim()) {
      setError('Both label and URL are required');
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      if (editingLink) {
        await axios.put(`/api/dashboard/custom-links/${editingLink.id}`, formData);
        setLinks(links.map(link =>
          link.id === editingLink.id
            ? { ...link, ...formData }
            : link
        ));
      } else {
        const response = await axios.post('/api/dashboard/custom-links', formData);
        const newLink = {
          id: response.data.id,
          ...formData,
          sort_order: links.length
        };
        setLinks([...links, newLink]);
      }
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save link');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (linkId) => {
    if (!window.confirm('Are you sure you want to delete this link?')) {
      return;
    }

    try {
      await axios.delete(`/api/dashboard/custom-links/${linkId}`);
      setLinks(links.filter(link => link.id !== linkId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete link');
    }
  };

  const handleClickLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Custom Links</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          size="small"
        >
          Add Link
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {links.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No custom links yet. Click "Add Link" to create your first link.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {links.map((link) => (
            <Grid item xs={12} sm={6} md={4} key={link.id}>
              <Card variant="outlined">
                <CardContent sx={{ pb: '16px !important' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1} minWidth={0}>
                      <Typography variant="subtitle2" noWrap title={link.label}>
                        {link.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap title={link.url}>
                        {link.url}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="Open Link">
                        <IconButton
                          size="small"
                          onClick={() => handleClickLink(link.url)}
                        >
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Link">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(link)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Link">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(link.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingLink ? 'Edit Link' : 'Add New Link'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Link Label"
            fullWidth
            variant="outlined"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="URL"
            fullWidth
            variant="outlined"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://example.com"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : (editingLink ? 'Update' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomLinks;