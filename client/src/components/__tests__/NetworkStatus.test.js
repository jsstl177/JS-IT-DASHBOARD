import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import NetworkStatus from '../NetworkStatus';

const theme = createTheme();

function renderWithTheme(ui) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('NetworkStatus', () => {
  it('renders "All systems operational" when data is empty', () => {
    renderWithTheme(<NetworkStatus data={[]} sourceUrl={null} />);

    expect(screen.getByText('All systems operational')).toBeInTheDocument();
  });

  it('renders monitor items with correct names', () => {
    const data = [
      { id: 1, name: 'Web Server', status: 'down', url: 'https://example.com', lastPing: '2025-01-01', uptime: '99%' },
      { id: 2, name: 'Database', status: 'alerting', url: 'https://db.example.com', lastPing: '2025-01-01', uptime: '97%' },
    ];

    renderWithTheme(<NetworkStatus data={data} sourceUrl={null} />);

    expect(screen.getByText('Web Server')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('shows status chips with correct colors', () => {
    const data = [
      { id: 1, name: 'Web Server', status: 'down', url: 'https://example.com', lastPing: '2025-01-01', uptime: '99%' },
      { id: 2, name: 'Database', status: 'alerting', url: 'https://db.example.com', lastPing: '2025-01-01', uptime: '97%' },
    ];

    renderWithTheme(<NetworkStatus data={data} sourceUrl={null} />);

    // Find chip elements by their label text and traverse up to the chip root
    const downChip = screen.getByText('down').closest('.MuiChip-root');
    const alertingChip = screen.getByText('alerting').closest('.MuiChip-root');

    // MUI applies color classes like MuiChip-colorError, MuiChip-colorWarning
    expect(downChip).toHaveClass('MuiChip-colorError');
    expect(alertingChip).toHaveClass('MuiChip-colorWarning');
  });

  it('renders "Open" link when sourceUrl is provided', () => {
    renderWithTheme(<NetworkStatus data={[]} sourceUrl="https://uptime.example.com" />);

    const link = screen.getByText('Open');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://uptime.example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render "Open" link when sourceUrl is null', () => {
    renderWithTheme(<NetworkStatus data={[]} sourceUrl={null} />);

    expect(screen.queryByText('Open')).not.toBeInTheDocument();
  });
});
