/**
 * @fileoverview Power BI embedded report component.
 * Provides a link to the configured Power BI report for viewing
 * business intelligence KPIs and analytics.
 */

import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

function PowerBI({ data }) {
  const sourceUrl = data?.sourceUrl || data?.embedUrl;

  return (
    <Card className="powerbi-card">
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ fontSize: '24pt', fontWeight: 'bold' }}>
          KPI Information
        </Typography>
        {sourceUrl ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Power BI reports require authentication to view.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<OpenInNewIcon />}
              size="large"
            >
              Open Power BI Report
            </Button>
          </Box>
        ) : (
          <Typography variant="body2" color="textSecondary">
            Power BI report not configured
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default PowerBI;
