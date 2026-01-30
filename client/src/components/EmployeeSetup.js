import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, List, ListItem,
  Checkbox, FormControlLabel, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Accordion,
  AccordionSummary, AccordionDetails, Box
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';

function EmployeeSetup({ data }) {
  const [checklists, setChecklists] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    employee_name: '',
    employee_email: '',
    store_number: '',
    ticket_id: '',
    department: ''
  });

  useEffect(() => {
    fetchChecklists();
  }, []);

  const fetchChecklists = async () => {
    try {
      const response = await axios.get('/api/employee-setup');
      setChecklists(response.data);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    }
  };

  const handleCreateChecklist = async () => {
    try {
      await axios.post('/api/employee-setup', newEmployee);
      setDialogOpen(false);
      setNewEmployee({
        employee_name: '',
        employee_email: '',
        store_number: '',
        ticket_id: '',
        department: ''
      });
      fetchChecklists();
    } catch (error) {
      console.error('Error creating checklist:', error);
    }
  };

  const handleItemStatusChange = async (checklistId, itemId, status) => {
    try {
      await axios.patch(`/api/employee-setup/${checklistId}/items/${itemId}`, { status });
      fetchChecklists();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getItemStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'na': return '#ff9800';
      default: return '#757575';
    }
  };

  const groupItemsByCategory = (items) => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  };

  return (
    <Card className="employee-setup-card">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            New Employee Setup
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            size="small"
          >
            New Employee
          </Button>
        </Box>

        {checklists.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No employee setup checklists
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {checklists.map((checklist) => (
              <Grid item xs={12} md={6} lg={4} key={checklist.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="h6" component="h3">
                        {checklist.employee_name}
                      </Typography>
                      <Chip
                        label={`${checklist.completed_items}/${checklist.total_items}`}
                        color={getStatusColor(checklist.status)}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {checklist.employee_email} • Store {checklist.store_number}
                    </Typography>

                    {checklist.ticket_id && (
                      <Typography variant="body2" color="textSecondary">
                        Ticket: {checklist.ticket_id}
                      </Typography>
                    )}

                    <Box mt={2}>
                      {(() => {
                        const groupedItems = groupItemsByCategory(checklist.items || []);
                        return Object.entries(groupedItems).map(([category, items]) => (
                          <Accordion key={category} size="small">
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Box display="flex" alignItems="center" width="100%">
                                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                  {category}
                                </Typography>
                                <Chip
                                  label={`${items.filter(i => i.status === 'completed' || i.status === 'na').length}/${items.length}`}
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 1 }}>
                              <List dense>
                                {items.map((item) => (
                                  <ListItem key={item.id} sx={{ px: 0, py: 0.5 }}>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={item.status === 'completed'}
                                          indeterminate={item.status === 'na'}
                                          onChange={(e) => {
                                            const newStatus = e.target.checked ? 'completed' :
                                                             item.status === 'na' ? 'pending' : 'na';
                                            handleItemStatusChange(checklist.id, item.id, newStatus);
                                          }}
                                          size="small"
                                          sx={{
                                            color: getItemStatusColor(item.status),
                                            '&.Mui-checked': {
                                              color: getItemStatusColor(item.status),
                                            },
                                          }}
                                        />
                                      }
                                      label={
                                        <Box>
                                          <Typography variant="body2" component="span">
                                            {item.item_name}
                                          </Typography>
                                          {item.description && (
                                            <Typography variant="caption" color="textSecondary" display="block">
                                              {item.description}
                                            </Typography>
                                          )}
                                        </Box>
                                      }
                                      sx={{ width: '100%', alignItems: 'flex-start' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </AccordionDetails>
                          </Accordion>
                        ));
                      })()}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* New Employee Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Employee Setup Checklist</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Employee Name"
                  value={newEmployee.employee_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employee_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Employee Email"
                  type="email"
                  value={newEmployee.employee_email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employee_email: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Store Number"
                  value={newEmployee.store_number}
                  onChange={(e) => setNewEmployee({ ...newEmployee, store_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Ticket ID (Optional)"
                  value={newEmployee.ticket_id}
                  onChange={(e) => setNewEmployee({ ...newEmployee, ticket_id: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateChecklist} variant="contained">
              Create Checklist
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default EmployeeSetup;