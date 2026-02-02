import React, { useState, useMemo } from 'react';
import {
  Card, CardContent, Typography, Box, Chip, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

function formatTime(dateStr) {
  if (!dateStr) return '';
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

function Assets({ data, sourceUrl, totalCount }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(asset =>
      (asset.name || '').toLowerCase().includes(q) ||
      (asset.hostName || '').toLowerCase().includes(q) ||
      (asset.lastLoggedInBy || '').toLowerCase().includes(q) ||
      (asset.platform || '').toLowerCase().includes(q) ||
      (asset.status || '').toLowerCase().includes(q) ||
      (asset.patchStatus || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem' }}>
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
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Host</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Last Logged In By</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Platform</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Patch Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Last Seen</TableCell>
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
                      <TableCell>{asset.name || '-'}</TableCell>
                      <TableCell>{asset.hostName || '-'}</TableCell>
                      <TableCell>{asset.lastLoggedInBy || '-'}</TableCell>
                      <TableCell>{asset.platform || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={asset.status || 'Unknown'}
                          size="small"
                          color={getStatusColor(asset.status)}
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </TableCell>
                      <TableCell>{asset.patchStatus || '-'}</TableCell>
                      <TableCell>{formatTime(asset.lastCommunicatedTime)}</TableCell>
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
    </Card>
  );
}

export default Assets;