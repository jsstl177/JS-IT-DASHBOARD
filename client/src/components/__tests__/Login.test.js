import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import axios from 'axios';
import Login from '../Login';

jest.mock('axios');

const theme = createTheme();

function renderWithTheme(ui) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with username, password fields and login button', () => {
    renderWithTheme(<Login onLogin={jest.fn()} />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText('Settings Login')).toBeInTheDocument();
  });

  it('calls onLogin with token on successful submit', async () => {
    const user = userEvent.setup();
    const onLogin = jest.fn();

    axios.post.mockResolvedValueOnce({ data: { token: 'test-token' } });

    renderWithTheme(<Login onLogin={onLogin} />);

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/settings/login', {
        username: 'admin',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('test-token');
    });
  });

  it('shows error message on failed submit', async () => {
    const user = userEvent.setup();
    const onLogin = jest.fn();

    axios.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } },
    });

    renderWithTheme(<Login onLogin={onLogin} />);

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    expect(onLogin).not.toHaveBeenCalled();
  });

  it('disables button during loading', async () => {
    const user = userEvent.setup();
    let resolvePost;
    axios.post.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePost = resolve;
      })
    );

    renderWithTheme(<Login onLogin={jest.fn()} />);

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
    });

    // Resolve the pending request to avoid act() warnings
    resolvePost({ data: { token: 'test-token' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).toBeEnabled();
    });
  });

  it('button text changes to "Logging in..." during loading', async () => {
    const user = userEvent.setup();
    let resolvePost;
    axios.post.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePost = resolve;
      })
    );

    renderWithTheme(<Login onLogin={jest.fn()} />);

    // Before submit, button says "Login"
    expect(screen.getByRole('button', { name: /login/i })).toHaveTextContent('Login');

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // During loading, button says "Logging in..."
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /logging in/i })).toHaveTextContent('Logging in...');
    });

    // Resolve the pending request to avoid act() warnings
    resolvePost({ data: { token: 'test-token' } });

    // After loading, button returns to "Login"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).toHaveTextContent('Login');
    });
  });
});
