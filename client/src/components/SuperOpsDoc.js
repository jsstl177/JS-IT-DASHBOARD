import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import { OpenInNew, Description } from '@mui/icons-material';

function SuperOpsDoc({ data }) {
  const sourceUrl = data?.sourceUrl;
  const docUrl = data?.docUrl;

  return (
    <Card className="superops-doc-card">
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ fontSize: '36pt', fontWeight: 'bold' }}>
          Documentation / Passwords
        </Typography>
        {docUrl ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: 4,
              minHeight: 400,
              backgroundColor: '#f5f5f5',
              borderRadius: 2,
              border: '1px solid #ddd'
            }}
          >
            <Description sx={{ fontSize: 80, color: '#1976d2', mb: 3 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 500 }}>
              IT Documentation & Passwords
            </Typography>
            <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 4, maxWidth: 500 }}>
              Access your complete IT documentation and password repository in SuperOps. 
              This will open in a new tab for security reasons.
            </Typography>
            <Button
              variant="contained"
              size="large"
              color="primary"
              endIcon={<OpenInNew />}
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                paddingX: 4, 
                paddingY: 1.5,
                fontSize: '1.1rem',
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4
                }
              }}
            >
              Open Documentation in SuperOps
            </Button>
            {sourceUrl && (
              <Button
                variant="text"
                size="small"
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mt: 2, textTransform: 'none' }}
              >
                Or browse SuperOps dashboard
              </Button>
            )}
          </Box>
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
