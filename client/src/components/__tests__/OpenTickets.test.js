import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import OpenTickets from '../OpenTickets';

const theme = createTheme();

function renderWithTheme(ui) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

function makeTicket(overrides = {}) {
  return {
    id: 1,
    title: 'Default Ticket',
    status: 'open',
    priority: 'medium',
    created_at: '2025-01-01',
    updated_at: '2025-01-02',
    assignee: 'John',
    link: 'https://tickets.example.com/1',
    ...overrides,
  };
}

describe('OpenTickets', () => {
  it('renders "No open tickets" when data is empty', () => {
    renderWithTheme(<OpenTickets data={[]} sourceUrl={null} />);

    expect(screen.getByText('No open tickets')).toBeInTheDocument();
  });

  it('renders ticket titles', () => {
    const data = [
      makeTicket({ id: 1, title: 'Fix server crash' }),
      makeTicket({ id: 2, title: 'Update SSL certificate' }),
    ];

    renderWithTheme(<OpenTickets data={data} sourceUrl={null} />);

    expect(screen.getByText('Fix server crash')).toBeInTheDocument();
    expect(screen.getByText('Update SSL certificate')).toBeInTheDocument();
  });

  it('shows priority chips with correct colors', () => {
    const data = [
      makeTicket({ id: 1, title: 'Critical issue', priority: 'high' }),
      makeTicket({ id: 2, title: 'Urgent issue', priority: 'urgent' }),
      makeTicket({ id: 3, title: 'Medium issue', priority: 'medium' }),
      makeTicket({ id: 4, title: 'Low issue', priority: 'low' }),
      makeTicket({ id: 5, title: 'Unknown issue', priority: null }),
    ];

    renderWithTheme(<OpenTickets data={data} sourceUrl={null} />);

    // Find chips by their label text and check MUI color class
    const highChip = screen.getByText('high').closest('.MuiChip-root');
    const urgentChip = screen.getByText('urgent').closest('.MuiChip-root');
    const mediumChip = screen.getByText('medium').closest('.MuiChip-root');
    const lowChip = screen.getByText('low').closest('.MuiChip-root');
    const naChip = screen.getAllByText('N/A').find(el => el.closest('.MuiChip-root'));

    expect(highChip).toHaveClass('MuiChip-colorError');
    expect(urgentChip).toHaveClass('MuiChip-colorError');
    expect(mediumChip).toHaveClass('MuiChip-colorWarning');
    expect(lowChip).toHaveClass('MuiChip-colorSuccess');
    expect(naChip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
  });

  it('shows "And X more..." when more than 10 tickets', () => {
    const data = Array.from({ length: 13 }, (_, i) =>
      makeTicket({ id: i + 1, title: `Ticket ${i + 1}` })
    );

    renderWithTheme(<OpenTickets data={data} sourceUrl={null} />);

    expect(screen.getByText('And 3 more...')).toBeInTheDocument();
    // Only the first 10 tickets should be visible
    expect(screen.getByText('Ticket 1')).toBeInTheDocument();
    expect(screen.getByText('Ticket 10')).toBeInTheDocument();
    expect(screen.queryByText('Ticket 11')).not.toBeInTheDocument();
  });

  it('renders "Open" link when sourceUrl is provided', () => {
    renderWithTheme(<OpenTickets data={[]} sourceUrl="https://tickets.example.com" />);

    const link = screen.getByText('Open');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://tickets.example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render "Open" link when sourceUrl is not provided', () => {
    renderWithTheme(<OpenTickets data={[]} sourceUrl={null} />);

    expect(screen.queryByText('Open')).not.toBeInTheDocument();
  });
});
