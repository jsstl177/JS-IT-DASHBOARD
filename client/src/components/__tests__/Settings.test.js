import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import axios from 'axios';
import Settings from '../Settings';

jest.mock('axios');

const theme = createTheme();

function renderWithTheme(ui) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => 'test-token');
    // Default mock for the GET /api/settings call that fires on mount
    axios.get.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders "Dashboard Settings" heading', async () => {
    renderWithTheme(<Settings onClose={jest.fn()} />);

    expect(screen.getByText('Dashboard Settings')).toBeInTheDocument();

    // Wait for the settings fetch to complete to avoid act() warnings
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/settings', {
        headers: { Authorization: 'Bearer test-token' },
      });
    });
  });

  it('shows "Back to Dashboard" button that calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    renderWithTheme(<Settings onClose={onClose} />);

    const backButton = screen.getByRole('button', { name: /back to dashboard/i });
    expect(backButton).toBeInTheDocument();

    await user.click(backButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders service configuration form', async () => {
    renderWithTheme(<Settings onClose={jest.fn()} />);

    expect(screen.getByText('Add/Edit Service Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText(/base url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();

    // Wait for the settings fetch to complete to avoid act() warnings
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });
});
