import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, TextField, Button, Grid,
  Alert, List, ListItem, ListItemText, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Chip
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Edit as EditIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import MenuItem from '@mui/material/MenuItem';
import axios from 'axios';

const SERVICE_URL_HINTS = {
  'uptime-kuma': 'https://uptime-kuma.example.com',
  'superops': 'https://yourcompany.superops.ai',
  'automation-log': 'https://automation-log.example.com',
  'n8n': 'https://n8n.example.com',
  'proxmox': 'https://proxmox.example.com:8006',
  'powerbi': 'https://app.powerbi.com/reportEmbed?reportId=...',
  'smtp': 'smtp.example.com'
};

const SERVICE_PATH_HINTS = {
  'uptime-kuma': 'Base URL or full status-page URL — slug is auto-detected',
  'superops': 'Tenant URL — subdomain auto-extracted for GraphQL API',
  'automation-log': 'Appends /api/logs and /api/status',
  'n8n': 'Appends /rest/executions',
  'proxmox': 'Appends /api2/json/...',
  'powerbi': 'Full embed URL — no path appended',
  'smtp': 'SMTP server — use Base URL for host, API Key for port'
};

const SMTP_FIELD_LABELS = {
  base_url: 'SMTP Server',
  api_key: 'Port',
  username: 'Sender Email',
  password: 'SMTP Password'
};

const REFRESH_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

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
  const [editingService, setEditingService] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const stored = localStorage.getItem('refreshInterval');
    return stored ? Number(stored) : 60;
  });

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

      setSuccess(editingService ? 'Setting updated successfully' : 'Setting saved successfully');
      setEditingService(null);
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

  const handleEdit = (setting) => {
    setEditingService(setting.service);
    setNewSetting({
      service: setting.service,
      api_key: setting.api_key || '',
      api_secret: setting.api_secret || '',
      base_url: setting.base_url || '',
      username: setting.username || '',
      password: ''
    });
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setNewSetting({
      service: '',
      api_key: '',
      api_secret: '',
      base_url: '',
      username: '',
      password: ''
    });
    setError('');
    setSuccess('');
  };

  const getServiceDisplayName = (service) => {
    const names = {
      'uptime-kuma': 'Uptime Kuma',
      'superops': 'SuperOps',
      'automation-log': 'Automation Log',
      'n8n': 'N8N',
      'proxmox': 'Proxmox',
      'powerbi': 'Power BI',
      'smtp': 'SMTP Email'
    };
    return names[service] || service;
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        Dashboard Settings
      </Typography>

      <Grid container spacing={3}>
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
                      onClick={() => handleEdit(setting)}
                      sx={{ mr: 0.5 }}
                    >
                      <EditIcon />
                    </IconButton>
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

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {editingService ? `Edit ${getServiceDisplayName(editingService)} Configuration` : 'Add Service Configuration'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Service"
                    select
                    disabled={!!editingService}
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
                    <option value="smtp">SMTP Email</option>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={newSetting.service === 'smtp' ? SMTP_FIELD_LABELS.base_url : 'Base URL'}
                    placeholder={SERVICE_URL_HINTS[newSetting.service] || ''}
                    helperText={SERVICE_PATH_HINTS[newSetting.service] || ''}
                    value={newSetting.base_url}
                    onChange={(e) => setNewSetting({ ...newSetting, base_url: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={newSetting.service === 'smtp' ? SMTP_FIELD_LABELS.api_key : 'API Key'}
                    placeholder={newSetting.service === 'smtp' ? '587' : ''}
                    value={newSetting.api_key}
                    onChange={(e) => setNewSetting({ ...newSetting, api_key: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={newSetting.service === 'smtp' ? SMTP_FIELD_LABELS.username : 'Username'}
                    value={newSetting.username}
                    onChange={(e) => setNewSetting({ ...newSetting, username: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={newSetting.service === 'smtp' ? SMTP_FIELD_LABELS.password : 'Password'}
                    type="password"
                    placeholder={editingService ? 'Leave blank to keep existing' : ''}
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
                    startIcon={editingService ? <EditIcon /> : <AddIcon />}
                  >
                    {loading ? 'Saving...' : editingService ? 'Update Configuration' : 'Save Configuration'}
                  </Button>
                  {editingService && (
                    <Button
                      variant="outlined"
                      onClick={handleCancelEdit}
                      sx={{ ml: 1 }}
                    >
                      Cancel
                    </Button>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Dashboard Settings
          </Typography>
          <TextField
            select
            fullWidth
            label="Dashboard Refresh Rate"
            value={refreshInterval}
            onChange={(e) => {
              const val = Number(e.target.value);
              setRefreshInterval(val);
              localStorage.setItem('refreshInterval', String(val));
            }}
          >
            {REFRESH_OPTIONS.map((sec) => (
              <MenuItem key={sec} value={sec}>
                {sec}s
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

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