import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

function SuperOpsDoc({ data }) {
  const sourceUrl = data?.sourceUrl;
  const docUrl = data?.docUrl;

  return (
    <Card className="superops-doc-card">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Documentation / Passwords
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', fontSize: '14px' }}>
              Open in SuperOps
            </a>
          )}
        </Typography>
        {docUrl ? (
          <iframe
            title="SuperOps Documentation"
            width="100%"
            height="600"
            src={docUrl}
            frameBorder="0"
            style={{ border: '1px solid #ddd', borderRadius: '4px' }}
          ></iframe>
        ) : (
          <Typography variant="body2" color="textSecondary">
            SuperOps documentation not configured
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default SuperOpsDoc;
