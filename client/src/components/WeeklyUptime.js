/**
 * @fileoverview Weekly uptime statistics component.
 * Shows 7-day uptime percentages with drag-and-drop reordering
 * and color-coded progress bars. Sort order persists in localStorage.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, CardContent, Typography, Chip, Box, LinearProgress
} from '@mui/material';

const STORAGE_KEY = 'weeklyUptimeOrder';

function getColor(uptime) {
  if (uptime >= 0.999) return 'success';
  if (uptime >= 0.99) return 'warning';
  return 'error';
}

function formatUptime(uptime) {
  if (uptime == null) return 'N/A';
  return (uptime * 100).toFixed(2) + '%';
}

function isPriority(name) {
  const upper = name.toUpperCase();
  return upper.includes('WAN') || upper.includes('AT&T');
}

function sortItems(items, savedOrder) {
  if (!savedOrder || savedOrder.length === 0) {
    return [...items].sort((a, b) => {
      const aPri = isPriority(a.name);
      const bPri = isPriority(b.name);
      if (aPri !== bPri) return aPri ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  const orderMap = new Map(savedOrder.map((id, idx) => [id, idx]));
  return [...items].sort((a, b) => {
    const aIdx = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
    const bIdx = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
    if (aIdx !== bIdx) return aIdx - bIdx;
    const aPri = isPriority(a.name);
    const bPri = isPriority(b.name);
    if (aPri !== bPri) return aPri ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function WeeklyUptime({ data, sourceUrl }) {
  const items = data || [];

  const [savedOrder, setSavedOrder] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const sortedItems = sortItems(items, savedOrder);
  const dragCounter = useRef(0);

  // Persist order whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedOrder));
  }, [savedOrder]);

  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragEnter = useCallback((e, idx) => {
    e.preventDefault();
    dragCounter.current++;
    setOverIdx(idx);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setOverIdx(null);
      dragCounter.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, dropIdx) => {
    e.preventDefault();
    dragCounter.current = 0;
    setOverIdx(null);

    if (dragIdx == null || dragIdx === dropIdx) {
      setDragIdx(null);
      return;
    }

    const reordered = [...sortedItems];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);

    const newOrder = reordered.map(item => item.id);
    setSavedOrder(newOrder);
    setDragIdx(null);
  }, [dragIdx, sortedItems]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
    dragCounter.current = 0;
  }, []);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ fontSize: '24pt', fontWeight: 'bold' }}>
          Last 7-Days Uptime
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '10px', fontSize: '14px' }}
            >
              Open
            </a>
          )}
          {items.length > 0 && (
            <Chip
              label={items.length}
              size="small"
              sx={{ ml: 1, verticalAlign: 'middle' }}
            />
          )}
        </Typography>

        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No monitor data available.
          </Typography>
        ) : (
          <Box sx={{ overflow: 'auto', flex: 1 }}>
            {sortedItems.map((item, idx) => {
              const color = getColor(item.uptime);
              const isDragging = dragIdx === idx;
              const isOver = overIdx === idx;

              return (
                <Box
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragEnter={(e) => handleDragEnter(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    cursor: 'grab',
                    opacity: isDragging ? 0.4 : 1,
                    borderTop: isOver ? '2px solid' : '2px solid transparent',
                    borderColor: isOver ? 'primary.main' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'opacity 0.15s, background-color 0.15s',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 500
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Box sx={{ width: 120, flexShrink: 0 }}>
                    <LinearProgress
                      variant="determinate"
                      value={item.uptime != null ? item.uptime * 100 : 0}
                      color={color}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      minWidth: 60,
                      textAlign: 'right',
                      fontWeight: 600,
                      color: `${color}.main`,
                      flexShrink: 0
                    }}
                  >
                    {formatUptime(item.uptime)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default WeeklyUptime;