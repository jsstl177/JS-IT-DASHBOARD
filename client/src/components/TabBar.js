import React, { useState, useCallback, useRef } from 'react';
import {
  Tabs,
  Tab,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
  Chip,
  List,
  ListItem,
  Select,
  FormControl,
  InputLabel,
  IconButton as IconButtonMUI,
  Tooltip,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import AddBoxIcon from '@mui/icons-material/AddBox';
import SettingsIcon from '@mui/icons-material/Settings';
import { getModuleDisplayName } from '../hooks/useDashboardTabs';

export default function TabBar({
  tabs,
  activeTabId,
  onTabChange,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  onMoveModule,
  onAddModuleToTab,
  onReorderTabs,
  unassignedModules,
  moduleDisplayNames,
  updateModuleDisplayName,
  resetModuleDisplayNames,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [editingModule, setEditingModule] = useState(null);
  const [editedModuleName, setEditedModuleName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // --- Drag and Drop ---
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragCounter = useRef(0);

  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setOverIdx(null);
    }
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounter.current += 1;
  }, []);

  const handleDrop = useCallback((e, dropIdx) => {
    e.preventDefault();
    dragCounter.current = 0;
    setOverIdx(null);

    if (dragIdx == null || dragIdx === dropIdx) {
      setDragIdx(null);
      return;
    }

    onReorderTabs(dragIdx, dropIdx);
    setDragIdx(null);
  }, [dragIdx, onReorderTabs]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
    dragCounter.current = 0;
  }, []);

  // --- Menu ---
  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };
  const handleMenuClose = () => setMenuAnchor(null);

  // --- Add Tab ---
  const handleAddOpen = () => {
    setNewTabName('');
    setAddDialogOpen(true);
  };
  const handleAddConfirm = () => {
    if (newTabName.trim()) {
      onAddTab(newTabName.trim());
    }
    setAddDialogOpen(false);
  };

  // --- Rename ---
  const handleRenameOpen = () => {
    setRenameValue(activeTab.name);
    setRenameDialogOpen(true);
    handleMenuClose();
  };
  const handleRenameConfirm = () => {
    if (renameValue.trim()) {
      onRenameTab(activeTabId, renameValue.trim());
    }
    setRenameDialogOpen(false);
  };

  // --- Delete ---
  const handleDeleteOpen = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  const handleDeleteConfirm = () => {
    onDeleteTab(activeTabId);
    setDeleteDialogOpen(false);
  };

  // --- Manage Modules ---
  const handleManageOpen = () => {
    setManageDialogOpen(true);
    handleMenuClose();
  };

  // --- Settings / Edit Module Names ---
  const handleEditModuleName = (moduleKey) => {
    setEditingModule(moduleKey);
    setEditedModuleName(getModuleDisplayName(moduleKey));
    setSettingsDialogOpen(true);
  };

  const handleSaveModuleName = () => {
    if (editedModuleName.trim()) {
      updateModuleDisplayName(editingModule, editedModuleName.trim());
      setSnackbar({ open: true, message: 'Module name updated', severity: 'success' });
    }
    setSettingsDialogOpen(false);
    setEditingModule(null);
  };

  const handleResetModuleNames = () => {
    resetModuleDisplayNames();
    setSnackbar({ open: true, message: 'Module names reset to defaults', severity: 'success' });
    setSettingsDialogOpen(false);
  };

  const otherTabs = tabs.filter((t) => t.id !== activeTabId);

  return (
    <>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          px: 1,
          position: 'sticky',
          top: 66,
          zIndex: 99,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <Tabs
          value={activeTabId}
          onChange={(_, val) => onTabChange(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            flex: 1,
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              minHeight: 48,
              py: 0,
            },
          }}
        >
          {tabs.map((tab, idx) => (
            <Tab
              key={tab.id}
              value={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              sx={{
                opacity: dragIdx === idx ? 0.5 : 1,
                transform: overIdx === idx && dragIdx !== idx ? 'scale(1.02)' : 'none',
                transition: 'all 0.2s ease',
                cursor: 'move',
                ...(overIdx === idx && dragIdx !== idx && {
                  backgroundColor: 'action.hover',
                }),
              }}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pointerEvents: 'none' }}>
                  {tab.name}
                  <Chip
                    label={tab.modules.length}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>

        <IconButton size="small" onClick={handleAddOpen} title="Add tab">
          <AddIcon fontSize="small" />
        </IconButton>

        <IconButton size="small" onClick={handleMenuOpen} title="Tab options">
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* --- Context Menu --- */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleRenameOpen}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Rename Tab</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleManageOpen}>
          <ListItemIcon><ViewModuleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Manage Modules</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={handleDeleteOpen}
          disabled={tabs.length <= 1}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><DeleteIcon fontSize="small" color={tabs.length > 1 ? 'error' : 'disabled'} /></ListItemIcon>
          <ListItemText>Delete Tab</ListItemText>
        </MenuItem>
      </Menu>

      {/* --- Add Tab Dialog --- */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Tab</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tab Name"
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddConfirm()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddConfirm} variant="contained" disabled={!newTabName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Rename Dialog --- */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rename Tab</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tab Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRenameConfirm} variant="contained" disabled={!renameValue.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Delete Confirmation --- */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Tab</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{activeTab.name}</strong>?
            {activeTab.modules.length > 0 && (
              <>
                {' '}Its {activeTab.modules.length} module{activeTab.modules.length !== 1 ? 's' : ''} will
                be moved to <strong>{tabs[0]?.id !== activeTabId ? tabs[0]?.name : tabs[1]?.name}</strong>.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Manage Modules Dialog --- */}
      <Dialog open={manageDialogOpen} onClose={() => setManageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Modules — {activeTab.name}</DialogTitle>
        <DialogContent dividers>
          {activeTab.modules.length > 0 ? (
            <List dense disablePadding>
              {activeTab.modules.map((mod) => (
                <ListItem
                  key={mod}
                  sx={{
                    mb: 0.5,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                    {getModuleDisplayName(mod)}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleEditModuleName(mod)}
                    title="Edit name"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {otherTabs.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Move to...</InputLabel>
                      <Select
                        value=""
                        label="Move to..."
                        onChange={(e) => {
                          onMoveModule(mod, activeTabId, e.target.value);
                        }}
                      >
                        {otherTabs.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No modules on this tab.
            </Typography>
          )}

          {unassignedModules.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Unassigned Modules
              </Typography>
              <List dense disablePadding>
                {unassignedModules.map((mod) => (
                  <ListItem
                    key={mod}
                    sx={{
                      mb: 0.5,
                      borderRadius: 2,
                      border: '1px dashed',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      px: 2,
                      py: 1,
                    }}
                  >
                    <Typography variant="body2">
                      {getModuleDisplayName(mod)}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddBoxIcon />}
                      onClick={() => onAddModuleToTab(mod, activeTabId)}
                    >
                      Add
                    </Button>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Edit Module Name Dialog --- */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Module Name</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {editingModule ? `Editing: ${editingModule}` : 'Edit module name'}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Module Name"
            value={editedModuleName}
            onChange={(e) => setEditedModuleName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveModuleName()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)} disabled={!!editingModule}>
            Cancel
          </Button>
          <Button
            onClick={handleResetModuleNames}
            disabled={!!editingModule}
            color="error"
          >
            Reset All
          </Button>
          <Button
            onClick={handleSaveModuleName}
            variant="contained"
            disabled={!editedModuleName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Snackbar --- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}
