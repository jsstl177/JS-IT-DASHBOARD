import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, List, ListItem,
  Checkbox, FormControlLabel, Chip, Button, Grid, Accordion,
  AccordionSummary, AccordionDetails, Box
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import axios from 'axios';

const NEW_EMPLOYEE_FORM_URL = 'http://192.168.177.233:5678/form/b989d157-c15d-4f42-bbd5-8aecbb954654';

function EmployeeSetup({ data }) {
  const [checklists, setChecklists] = useState([]);

  const fetchChecklists = useCallback(async () => {
    try {
      const response = await axios.get('/api/employee-setup');
      setChecklists(response.data);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
    const interval = setInterval(fetchChecklists, 30000);
    return () => clearInterval(interval);
  }, [fetchChecklists]);

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

  // Define the desired category order
  const categoryOrder = [
    'Domain',
    'Outlook Email',
    'M365',
    'Dashlane',
    'INFORM',
    'JEN',
    'JU ONLINE',
    'Additional Setup',
    'Salto\'s',
    'CDA Alarm',
    'UPG Navigator',
    'MITS'
  ];

  const groupItemsByCategory = (items) => {
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    // Sort categories according to the defined order
    const sortedGrouped = {};
    categoryOrder.forEach(category => {
      if (grouped[category]) {
        sortedGrouped[category] = grouped[category];
      }
    });

    // Add any categories not in the predefined order
    Object.keys(grouped).forEach(category => {
      if (!sortedGrouped[category]) {
        sortedGrouped[category] = grouped[category];
      }
    });

    return sortedGrouped;
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
            startIcon={<OpenInNewIcon />}
            component="a"
            href={NEW_EMPLOYEE_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
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
          <Grid container spacing={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 2 }}>
            {checklists.map((checklist) => (
              <Card 
                variant="outlined" 
                key={checklist.id}
                sx={{ 
                  height: 'fit-content',
                  cursor: 'default'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
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
                          <Accordion 
                            key={category} 
                            size="small" 
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AccordionSummary 
                              expandIcon={<ExpandMoreIcon />}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
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
            ))}
          </Grid>
        )}

      </CardContent>
    </Card>
  );
}

export default EmployeeSetup;