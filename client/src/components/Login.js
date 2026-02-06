/**
 * @fileoverview Login screen component.
 * Handles user authentication via JWT tokens. Supports password manager
 * auto-fill by reading input values directly from refs on submit.
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, Typography, TextField, Button, Alert } from '@mui/material';
import axios from 'axios';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Get values directly from refs to support password manager auto-fill
    const usernameValue = usernameRef.current?.value || username;
    const passwordValue = passwordRef.current?.value || password;

    try {
      const response = await axios.post('/api/settings/login', {
        username: usernameValue,
        password: passwordValue
      });

      onLogin(response.data.token, usernameValue);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card style={{ minWidth: '300px', maxWidth: '400px' }}>
        <CardContent style={{ textAlign: 'center', paddingTop: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <img
              src="/logo.png"
              alt="Johnstone Supply"
              style={{
                width: '120px',
                height: 'auto',
                marginBottom: '16px'
              }}
            />
          </div>
          <Typography variant="h5" component="h2" gutterBottom>
            Dashboard Login
          </Typography>
          <form onSubmit={handleSubmit} autoComplete="on">
            <TextField
              fullWidth
              label="Username"
              name="username"
              id="username"
              inputRef={usernameRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoComplete="username"
              inputProps={{
                autoComplete: 'username',
                'aria-label': 'Username'
              }}
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              id="password"
              type="password"
              inputRef={passwordRef}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
              inputProps={{
                autoComplete: 'current-password',
                'aria-label': 'Password'
              }}
            />
            {error && (
              <Alert severity="error" style={{ marginTop: '10px' }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              style={{ marginTop: '20px' }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;