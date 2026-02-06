/**
 * @fileoverview Employee onboarding checklist component.
 * Kanban-style card system for tracking new hire setup progress across
 * categories (Domain, M365, Dashlane, INFORM, etc.) with auto-refresh
 * and automatic status progression.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, List, ListItem,
  Checkbox, FormControlLabel, Chip, Button, Grid, Accordion,
  AccordionSummary, AccordionDetails, Box, Tabs, Tab
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import axios from 'axios';

const NEW_EMPLOYEE_FORM_URL = 'http://192.168.177.233:5678/form/b989d157-c15d-4f42-bbd5-8aecbb954654';

function EmployeeSetup({ data }) {
  const [activeChecklists, setActiveChecklists] = useState([]);
  const [completedChecklists, setCompletedChecklists] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);

  const fetchChecklists = useCallback(async () => {
    try {
      const response = await axios.get('/api/employee-setup');
      setActiveChecklists(response.data.active || []);
      setCompletedChecklists(response.data.completed || []);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const getStartDateColor = (startDate) => {
    if (!startDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = start - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 14) return '#4caf50'; // Green - more than 2 weeks
    if (diffDays >= 7) return '#ff9800'; // Yellow/Orange - 1-2 weeks
    return '#f44336'; // Red - less than 1 week
  };

  const formatStartDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
    <Card className="employee-setup-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} sx={{ flexShrink: 0 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: '24pt', fontWeight: 'bold' }}>
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

        {/* Legend */}
        <Box 
          display="flex" 
          gap={2} 
          mb={2} 
          sx={{ 
            flexShrink: 0,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>
            Start Date Legend:
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box 
              sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#4caf50',
                borderRadius: '4px'
              }} 
            />
            <Typography variant="body2">
              &gt; 2 weeks
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box 
              sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#ff9800',
                borderRadius: '4px'
              }} 
            />
            <Typography variant="body2">
              1-2 weeks
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box 
              sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#f44336',
                borderRadius: '4px'
              }} 
            />
            <Typography variant="body2">
              &lt; 1 week
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, flexShrink: 0 }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="employee setup tabs">
            <Tab label={`Active (${activeChecklists.length})`} />
            <Tab label={`Completed (${completedChecklists.length})`} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {currentTab === 0 && activeChecklists.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            No active employee setup checklists
          </Typography>
        )}
        
        {currentTab === 1 && completedChecklists.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            No completed employee setup checklists
          </Typography>
        )}

        {((currentTab === 0 && activeChecklists.length > 0) || (currentTab === 1 && completedChecklists.length > 0)) && (
          <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Grid container spacing={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 2 }}>
              {(currentTab === 0 ? activeChecklists : completedChecklists).map((checklist) => (
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

                    {checklist.start_date && (
                      <Box 
                        sx={{ 
                          display: 'inline-block',
                          backgroundColor: getStartDateColor(checklist.start_date),
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: 'bold',
                          mb: 1
                        }}
                      >
                        Start Date: {formatStartDate(checklist.start_date)}
                      </Box>
                    )}

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
          </Box>
        )}

      </CardContent>
    </Card>
  );
}

export default EmployeeSetup;