import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, TextField, Button, Grid,
  Alert, List, ListItem, ListItemText, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Chip
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import axios from 'axios';

function Settings({ onClose }) {
  const [settings, setSettings] = useState([]);
  const [newSetting, setNewSetting] = useState({
    service: '',
    api_key: '',
    api_secret: '',
    base_url: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, service: null });
  const [testingService, setTestingService] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (err) {
      setError('Failed to fetch settings');
    }
  };

  const handleSave = async () => {
    if (!newSetting.service) {
      setError('Service name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      await axios.post('/api/settings', newSetting, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Setting saved successfully');
      setNewSetting({
        service: '',
        api_key: '',
        api_secret: '',
        base_url: '',
        username: '',
        password: ''
      });
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save setting');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (service) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`/api/settings/${service}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Setting deleted successfully');
      fetchSettings();
    } catch (err) {
      setError('Failed to delete setting');
    }
    setDeleteDialog({ open: false, service: null });
  };

  const handleTestConnection = async (service) => {
    setTestingService(service);
    setTestResult(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`/api/settings/test/${service}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestResult({ service, ...response.data });
    } catch (err) {
      setTestResult({ service, success: false, message: err.response?.data?.message || 'Test request failed.' });
    } finally {
      setTestingService(null);
    }
  };

  const getServiceDisplayName = (service) => {
    const names = {
      'uptime-kuma': 'Uptime Kuma',
      'superops': 'SuperOps',
      'automation-log': 'Automation Log',
      'n8n': 'N8N',
      'proxmox': 'Proxmox',
      'powerbi': 'Power BI'
    };
    return names[service] || service;
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Add/Edit Service Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Service"
                    select
                    value={newSetting.service}
                    onChange={(e) => setNewSetting({ ...newSetting, service: e.target.value })}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Select Service</option>
                    <option value="uptime-kuma">Uptime Kuma</option>
                    <option value="superops">SuperOps</option>
                    <option value="automation-log">Automation Log</option>
                    <option value="n8n">N8N</option>
                    <option value="proxmox">Proxmox</option>
                    <option value="powerbi">Power BI</option>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Base URL"
                    value={newSetting.base_url}
                    onChange={(e) => setNewSetting({ ...newSetting, base_url: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="API Key"
                    value={newSetting.api_key}
                    onChange={(e) => setNewSetting({ ...newSetting, api_key: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={newSetting.username}
                    onChange={(e) => setNewSetting({ ...newSetting, username: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={newSetting.password}
                    onChange={(e) => setNewSetting({ ...newSetting, password: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={loading}
                    startIcon={<AddIcon />}
                  >
                    {loading ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Configurations
              </Typography>
              <List>
                {settings.map((setting) => (
                  <ListItem key={setting.service}>
                    <ListItemText
                      primary={getServiceDisplayName(setting.service)}
                      secondary={`URL: ${setting.base_url || 'Not set'}`}
                    />
                    {testResult && testResult.service === setting.service && (
                      <Chip
                        label={testResult.success ? 'OK' : 'Failed'}
                        color={testResult.success ? 'success' : 'error'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={testingService === setting.service ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                      onClick={() => handleTestConnection(setting.service)}
                      disabled={testingService !== null}
                      sx={{ mr: 1 }}
                    >
                      Test
                    </Button>
                    <IconButton
                      edge="end"
                      onClick={() => setDeleteDialog({ open: true, service: setting.service })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" style={{ marginTop: '20px' }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" style={{ marginTop: '20px' }}>
          {success}
        </Alert>
      )}
      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          style={{ marginTop: '20px' }}
          onClose={() => setTestResult(null)}
        >
          <strong>{getServiceDisplayName(testResult.service)}:</strong> {testResult.message}
        </Alert>
      )}

      <div style={{ marginTop: '20px' }}>
        <Button variant="outlined" onClick={onClose}>
          Back to Dashboard
        </Button>
      </div>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, service: null })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the configuration for {getServiceDisplayName(deleteDialog.service)}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, service: null })}>Cancel</Button>
          <Button onClick={() => handleDelete(deleteDialog.service)} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Settings;