import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

function PowerBI({ data }) {
  const sourceUrl = data?.sourceUrl || data?.embedUrl;

  return (
    <Card className="powerbi-card">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          KPI Information
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', fontSize: '14px' }}>
              Open
            </a>
          )}
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
