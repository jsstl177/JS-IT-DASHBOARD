import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

function PowerBI({ data }) {
  return (
    <Card className="powerbi-card">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          KPI Information
          <a href="https://app.powerbi.com/groups/me/reports/919d8b16-e1fd-4633-8bd8-3cdcd1f89102/b5de83ec9295fdc36774?ctid=55abe456-690b-4b1c-8514-d8e516e31228&openDashboardSource=EmailSubscription&experience=power-bi" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', fontSize: '14px' }}>
            🔗
          </a>
        </Typography>
        {data?.embedUrl ? (
          <iframe
            title="Power BI Report"
            width="100%"
            height="300"
            src={data.embedUrl}
            frameBorder="0"
            allowFullScreen="true"
          ></iframe>
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