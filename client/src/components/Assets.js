import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, Chip, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment, IconButton, Menu, MenuItem, Checkbox, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SettingsIcon from '@mui/icons-material/Settings';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import axios from 'axios';

const ALL_FIELDS = [
  'name', 'hostName', 'loggedInUser', 'platform', 'status', 
  'patchStatus', 'lastCommunicatedTime', 'assetClass', 
  'client', 'site', 'serialNumber', 'manufacturer', 'model'
];

function formatTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getStatusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'online' || s === 'active') return 'success';
  if (s === 'offline' || s === 'inactive') return 'error';
  return 'default';
}

function renderCellValue(asset, field) {
  const value = asset[field];
  
  if (field === 'lastCommunicatedTime') {
    return formatTime(value);
  }
  
  if (field === 'status') {
    return (
      <Chip
        label={value || 'Unknown'}
        size="small"
        color={getStatusColor(value)}
        sx={{ fontSize: '0.7rem', height: 20 }}
      />
    );
  }
  
  return value || '-';
}

function Assets({ data, sourceUrl, totalCount }) {
  const [search, setSearch] = useState('');
  const [columns, setColumns] = useState([]);
  const [settingsMenu, setSettingsMenu] = useState(null);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [tempColumns, setTempColumns] = useState([]);
  const [userId, setUserId] = useState(1);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem('dashboardUserId');
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    }
  }, []);

  const fetchColumns = useCallback(async () => {
    try {
      const response = await axios.get(`/api/asset-columns/columns?userId=${userId}`, {
        headers: getAuthHeaders()
      });
      setColumns(response.data);
    } catch (error) {
      console.error('Failed to fetch columns:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  const visibleColumns = useMemo(() => 
    columns.filter(col => col.visible).sort((a, b) => a.sort_order - b.sort_order),
    [columns]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(asset => {
      const searchableFields = ALL_FIELDS;
      return searchableFields.some(field => {
        const value = asset[field];
        return value && String(value).toLowerCase().includes(q);
      });
    });
  }, [data, search]);

  const handleOpenSettings = (event) => {
    setSettingsMenu(event.currentTarget);
  };

  const handleCloseSettings = () => {
    setSettingsMenu(null);
  };

  const handleOpenColumnDialog = () => {
    setTempColumns([...columns]);
    setColumnDialogOpen(true);
    handleCloseSettings();
  };

  const handleCloseColumnDialog = () => {
    setColumnDialogOpen(false);
    setTempColumns([]);
  };

  const handleToggleColumn = (index) => {
    const updated = [...tempColumns];
    updated[index].visible = !updated[index].visible;
    setTempColumns(updated);
  };

  const handleMoveColumn = (index, direction) => {
    const updated = [...tempColumns];
    const temp = updated[index];
    
    if (direction === 'up' && index > 0) {
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'down' && index < updated.length - 1) {
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    
    updated.forEach((col, idx) => {
      col.sort_order = idx;
    });
    
    setTempColumns(updated);
  };

  const handleSaveColumns = async () => {
    try {
      await axios.post('/api/asset-columns/columns', {
        userId,
        columns: tempColumns.map(col => ({
          key: col.column_key,
          label: col.column_label,
          visible: col.visible,
          sortOrder: col.sort_order
        }))
      }, {
        headers: getAuthHeaders()
      });
      setColumns(tempColumns);
      setColumnDialogOpen(false);
      setTempColumns([]);
    } catch (error) {
      console.error('Failed to save columns:', error);
    }
  };

  const handleResetColumns = async () => {
    try {
      await axios.post('/api/asset-columns/columns/reset', { userId }, {
        headers: getAuthHeaders()
      });
      await fetchColumns();
      setColumnDialogOpen(false);
      setTempColumns([]);
    } catch (error) {
      console.error('Failed to reset columns:', error);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: '24pt', fontWeight: 'bold' }}>
            Assets
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
            <TextField
              size="small"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 220 }}
            />
            <IconButton size="small" onClick={handleOpenSettings}>
              <SettingsIcon fontSize="small" />
            </IconButton>
            {totalCount > 0 && (
              <Chip
                label={`${filtered.length}${search ? ` / ${totalCount}` : ''} assets`}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        {data.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No assets found
          </Typography>
        ) : (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {visibleColumns.map((col) => (
                      <TableCell key={col.column_key} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                        {col.column_label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 30 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((asset) => (
                    <TableRow
                      key={asset.id}
                      component={asset.link ? 'a' : 'tr'}
                      href={asset.link || undefined}
                      target={asset.link ? '_blank' : undefined}
                      rel={asset.link ? 'noopener noreferrer' : undefined}
                      hover
                      sx={{
                        textDecoration: 'none',
                        cursor: asset.link ? 'pointer' : 'default',
                        '& td': { fontSize: '0.8rem', py: 0.5 }
                      }}
                    >
                      {visibleColumns.map((col) => (
                        <TableCell key={col.column_key}>
                          {renderCellValue(asset, col.column_key)}
                        </TableCell>
                      ))}
                      <TableCell>
                        {asset.link && <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </CardContent>

      <Menu
        anchorEl={settingsMenu}
        open={Boolean(settingsMenu)}
        onClose={handleCloseSettings}
      >
        <MenuItem onClick={handleOpenColumnDialog}>Configure Columns</MenuItem>
      </Menu>

      <Dialog open={columnDialogOpen} onClose={handleCloseColumnDialog} maxWidth="md" fullWidth>
        <DialogTitle>Configure Asset Columns</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {tempColumns.map((col, index) => (
              <Box key={col.column_key} sx={{ display: 'flex', alignItems: 'center', py: 1, borderBottom: '1px solid #eee' }}>
                <IconButton
                  size="small"
                  onClick={() => handleMoveColumn(index, 'up')}
                  disabled={index === 0}
                >
                  <DragHandleIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleMoveColumn(index, 'down')}
                  disabled={index === tempColumns.length - 1}
                >
                  <DragHandleIcon />
                </IconButton>
                <Checkbox
                  checked={col.visible}
                  onChange={() => handleToggleColumn(index)}
                />
                <ListItemText primary={col.column_label} />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetColumns} color="error">Reset to Defaults</Button>
          <Button onClick={handleCloseColumnDialog}>Cancel</Button>
          <Button onClick={handleSaveColumns} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default Assets;
