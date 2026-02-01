import React, { useState } from 'react';
import {
  Card, CardContent, Typography, Box, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, LinearProgress, Table,
  TableBody, TableRow, TableCell, TableHead, TableContainer, IconButton,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds) {
  if (!seconds) return 'N/A';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function UsageBar({ label, used, total, color = 'primary' }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const barColor = pct > 90 ? 'error' : pct > 70 ? 'warning' : color;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {formatBytes(used)} / {formatBytes(total)} ({pct.toFixed(1)}%)
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        color={barColor}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

function NodeDetailDialog({ node, open, onClose }) {
  if (!node) return null;
  const s = node.status || {};
  const cpuPct = (s.cpu || 0) * 100;
  const cpuColor = cpuPct > 90 ? 'error' : cpuPct > 70 ? 'warning' : 'primary';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          {node.node}
          <Chip
            label={s.uptime ? 'Online' : 'Offline'}
            color={s.uptime ? 'success' : 'error'}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* CPU */}
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>CPU</Typography>
        <Box sx={{ mb: 0.25 }}>
          <Typography variant="body2" color="text.secondary">
            {s.cpuinfo ? `${s.cpuinfo.model || 'Unknown'} — ${s.cpuinfo.cores || '?'} cores (${s.cpuinfo.sockets || 1} socket${(s.cpuinfo.sockets || 1) > 1 ? 's' : ''})` : 'N/A'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
          <Typography variant="body2" color="text.secondary">Usage</Typography>
          <Typography variant="body2" color="text.secondary">{cpuPct.toFixed(1)}%</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(cpuPct, 100)}
          color={cpuColor}
          sx={{ height: 8, borderRadius: 4, mb: 2 }}
        />

        {/* Memory */}
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Memory</Typography>
        <UsageBar label="" used={s.memory?.used} total={s.memory?.total} />

        {/* Storage */}
        {node.storage && node.storage.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>Storage</Typography>
            {node.storage.map((pool) => (
              <UsageBar
                key={pool.storage}
                label={`${pool.storage} (${pool.type || ''})`}
                used={pool.used}
                total={pool.total}
              />
            ))}
          </>
        )}

        {/* Uptime & Load */}
        <Box sx={{ display: 'flex', gap: 3, mt: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Uptime: <strong>{formatUptime(s.uptime)}</strong>
          </Typography>
          {s.loadavg && (
            <Typography variant="body2" color="text.secondary">
              Load: <strong>{s.loadavg.map(v => Number(v).toFixed(2)).join(', ')}</strong>
            </Typography>
          )}
        </Box>

        {/* VMs */}
        {node.vms && node.vms.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
              Virtual Machines ({node.vms.length})
            </Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">CPU</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Memory</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {node.vms.map((vm) => (
                    <TableRow key={vm.vmid} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>{vm.name || vm.vmid}</TableCell>
                      <TableCell>
                        <Chip
                          label={vm.status}
                          size="small"
                          color={vm.status === 'running' ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {vm.cpu != null ? `${(vm.cpu * 100).toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {vm.mem != null && vm.maxmem ? `${formatBytes(vm.mem)} / ${formatBytes(vm.maxmem)}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Containers */}
        {node.containers && node.containers.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
              Containers ({node.containers.length})
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">CPU</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Memory</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {node.containers.map((ct) => (
                    <TableRow key={ct.vmid} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>{ct.name || ct.vmid}</TableCell>
                      <TableCell>
                        <Chip
                          label={ct.status}
                          size="small"
                          color={ct.status === 'running' ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {ct.cpu != null ? `${(ct.cpu * 100).toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {ct.mem != null && ct.maxmem ? `${formatBytes(ct.mem)} / ${formatBytes(ct.maxmem)}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {node.link && (
          <Button
            href={node.link}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<OpenInNewIcon />}
          >
            Open Proxmox UI
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ProxmoxStatus({ data, sourceUrl }) {
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem' }}>
              Proxmox Status
            </Typography>
            {sourceUrl && (
              <Button
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                startIcon={<OpenInNewIcon />}
              >
                Open
              </Button>
            )}
          </Box>
          {data.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No Proxmox data available
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto', flex: 1 }}>
              {data.map((node) => {
                const s = node.status || {};
                const cpuPct = (s.cpu || 0) * 100;
                const memPct = s.memory?.total ? (s.memory.used / s.memory.total) * 100 : 0;
                const isOnline = !!s.uptime;

                return (
                  <Box
                    key={node.node}
                    onClick={() => setSelectedNode(node)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {isOnline
                      ? <CheckCircleIcon color="success" fontSize="small" />
                      : <ErrorIcon color="error" fontSize="small" />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {node.node}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        CPU: {cpuPct.toFixed(0)}%{' · '}
                        RAM: {memPct.toFixed(0)}%{' · '}
                        {node.vms?.length || 0} VMs{' · '}
                        {node.containers?.length || 0} CTs
                      </Typography>
                    </Box>
                    <Chip
                      label={isOnline ? 'Online' : 'Offline'}
                      color={isOnline ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      <NodeDetailDialog
        node={selectedNode}
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </>
  );
}

export default ProxmoxStatus;
