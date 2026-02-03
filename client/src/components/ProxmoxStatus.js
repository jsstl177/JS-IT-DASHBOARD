import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Box, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, LinearProgress, Table,
  TableBody, TableRow, TableCell, TableHead, TableContainer, IconButton,
  Tooltip, Grid, Paper, Divider
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryIcon from '@mui/icons-material/Memory';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';

function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
  return `${(bytesPerSecond / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
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

function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

function MetricCard({ icon: Icon, label, value, color = 'primary' }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Icon color={color} fontSize="small" />
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

function NodeDetailDialog({ node, open, onClose }) {
  if (!node) return null;
  const s = node.status || {};
  const m = node.metrics || {};
  const cpuPct = (s.cpu || m.cpu || 0) * 100;
  const cpuColor = cpuPct > 90 ? 'error' : cpuPct > 70 ? 'warning' : 'primary';
  const lastUpdated = node.lastUpdated;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
          {lastUpdated && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              Updated: {formatDateTime(lastUpdated)}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* CPU Section */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MemoryIcon fontSize="small" /> CPU
            </Typography>
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
          </Grid>

          {/* Memory Section */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              <MemoryIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Memory
            </Typography>
            <UsageBar label="RAM" used={s.memory?.used} total={s.memory?.total} />
            
            {/* Swap Usage */}
            {s.swap?.total > 0 && (
              <UsageBar 
                label="Swap" 
                used={s.swap?.used} 
                total={s.swap?.total} 
                color="secondary"
              />
            )}
          </Grid>

          {/* Disk I/O Metrics */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              <StorageOutlinedIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Disk I/O
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <MetricCard 
                icon={StorageOutlinedIcon} 
                label="Read" 
                value={formatSpeed(m.diskRead)} 
              />
              <MetricCard 
                icon={StorageOutlinedIcon} 
                label="Write" 
                value={formatSpeed(m.diskWrite)} 
              />
            </Box>
          </Grid>

          {/* Network I/O Metrics */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              <NetworkCheckIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Network I/O
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <MetricCard 
                icon={SwapHorizIcon} 
                label="Inbound" 
                value={formatSpeed(m.netIn)} 
              />
              <MetricCard 
                icon={SwapHorizIcon} 
                label="Outbound" 
                value={formatSpeed(m.netOut)} 
              />
            </Box>
          </Grid>

          {/* Storage Pools */}
          {node.storage && node.storage.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>Storage Pools</Typography>
              {node.storage.map((pool) => (
                <UsageBar
                  key={pool.storage}
                  label={`${pool.storage} (${pool.type || ''})`}
                  used={pool.used}
                  total={pool.total}
                />
              ))}
            </Grid>
          )}

          {/* Uptime & Load */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Uptime: <strong>{formatUptime(s.uptime)}</strong>
              </Typography>
              {s.loadavg && (
                <Typography variant="body2" color="text.secondary">
                  Load: <strong>{s.loadavg.map(v => Number(v).toFixed(2)).join(', ')}</strong>
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Network Interfaces */}
          {node.network && node.network.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Network Interfaces ({node.network.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Interface</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Active</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {node.network.map((iface) => (
                      <TableRow key={iface.iface}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {iface.iface}
                        </TableCell>
                        <TableCell>{iface.type || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={iface.active ? 'Yes' : 'No'}
                            size="small"
                            color={iface.active ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}

          {/* VMs */}
          {node.vms && node.vms.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
                Virtual Machines ({node.vms.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
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
            </Grid>
          )}

          {/* Containers */}
          {node.containers && node.containers.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
                Containers ({node.containers.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
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
            </Grid>
          )}

          {/* Services */}
          {node.services && node.services.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
                Services ({node.services.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>State</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Unit-State</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {node.services.map((service, idx) => (
                      <TableRow key={service.name || idx} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {service.name || service.service || '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={service.state || 'unknown'}
                            size="small"
                            color={service.state === 'running' ? 'success' : service.state === 'stopped' ? 'default' : 'warning'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={service['unit-state'] || service.unitState || 'unknown'}
                            size="small"
                            color={service['unit-state'] === 'active' || service.unitState === 'active' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {service.desc || service.description || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}
        </Grid>
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

function ProxmoxStatus({ data, sourceUrl, lastUpdated, onRefresh }) {
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" component="h2" sx={{ fontSize: '36pt', fontWeight: 'bold' }}>
              Proxmox Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {lastUpdated && (
                <Tooltip title={`Last updated: ${new Date(lastUpdated).toLocaleString()}`}>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(lastUpdated)}
                  </Typography>
                </Tooltip>
              )}
              {onRefresh && (
                <IconButton onClick={onRefresh} size="small" title="Refresh now">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              )}
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
          </Box>
          {data.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No Proxmox data available
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto', flex: 1 }}>
              {data.map((node) => {
                const s = node.status || {};
                const m = node.metrics || {};
                const cpuPct = (s.cpu || m.cpu || 0) * 100;
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
                        RAM: {memPct.toFixed(0)}%
                        {s.swap?.total > 0 && ` · Swap: ${((s.swap.used / s.swap.total) * 100).toFixed(0)}%`}
                        {' · '}
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
