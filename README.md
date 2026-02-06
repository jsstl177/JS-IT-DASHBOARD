# JS IT Dashboard

A production-ready, Docker-deployable web dashboard that aggregates IT monitoring data from multiple sources including Uptime Kuma, SuperOps, Proxmox VE, N8N workflows, and Power BI.

**Version**: BETA 5 - Base Application

## Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 19, Material UI 7, React Grid Layout      |
| Backend    | Node.js 18+, Express 5                          |
| Database   | MariaDB 10.11 (mysql2 connection pool)           |
| Auth       | JWT (jsonwebtoken), bcryptjs password hashing    |
| Encryption | AES-256-GCM (Node.js crypto)                    |
| Security   | Helmet.js, express-rate-limit, CORS, validator   |
| Container  | Docker multi-stage builds, dumb-init, Compose    |
| Testing    | Jest, Supertest, React Testing Library           |

## Features

- **Multi-User Authentication** - JWT-based auth with role-based access control (admin/standard)
- **Modular Dashboard** - Drag-and-drop, resizable widget grid with multi-tab organization
- **13 Service Modules** - Integrates Uptime Kuma, SuperOps, Proxmox, N8N, Power BI, and more
- **Encrypted Credentials** - All service API keys encrypted at rest with AES-256-GCM
- **5 Built-in Themes** - Light, Dark, High Contrast, Blue Ocean, Forest
- **Custom Links** - Per-user customizable quick-access links
- **Alert Management** - View and resolve SuperOps alerts with severity-based filtering
- **Ticket Creation** - Submit new SuperOps tickets directly from the dashboard
- **Employee Onboarding** - Kanban-style checklist for tracking new hire setup
- **Asset Management** - Customizable columns, full-text search across 13 fields
- **Auto-Refresh** - Configurable interval with live countdown timer
- **Production Hardened** - Rate limiting, security headers, structured logging, graceful shutdown

## Supported Modules

| # | Module | Data Source | Description |
|---|--------|-------------|-------------|
| 1 | Network Status | Uptime Kuma | Shows only down/alerting monitors |
| 2 | Weekly Uptime | Uptime Kuma | 7-day uptime stats with drag-and-drop reordering |
| 3 | Monthly Uptime | Uptime Kuma | 30-day uptime stats with drag-and-drop reordering |
| 4 | Open Cases | SuperOps | Open tickets with ticket creation capability |
| 5 | Alerts | SuperOps | Active alerts with severity filtering and resolve |
| 6 | Assets | SuperOps | Asset inventory with customizable columns |
| 7 | SuperOps Docs | SuperOps | Quick access to IT documentation portal |
| 8 | Employee Setup | Internal DB | Kanban checklist for new hire onboarding |
| 9 | Automation Logs | Custom API | Custom log endpoint for automation monitoring |
| 10 | N8N Workflows | N8N | Recent workflow executions with status tracking |
| 11 | Proxmox Status | Proxmox VE | VM/CT host info and resource monitoring |
| 12 | Power BI KPI | Power BI | Embedded business intelligence reports |
| 13 | Custom Links | Internal DB | Per-user customizable link management |

## Quick Start

### Docker Compose (Recommended)

```bash
# Clone and configure
git clone https://github.com/jsstl177/JS-IT-DASHBOARD.git
cd JS-IT-DASHBOARD
cp .env.example .env   # Edit .env with your configuration

# Build and run
docker-compose up --build

# Access at http://localhost:5000
```

### Manual Installation

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure environment
cp .env.example .env   # Edit .env with your configuration

# Start backend (terminal 1)
cd server && npm start

# Start frontend (terminal 2)
cd client && npm start
```

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123` (or value of `DEFAULT_ADMIN_PASSWORD` env var)

After first login, change the admin password and create individual user accounts from User Management.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Secret key for JWT tokens | *required* |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password | `admin123` |
| `DB_HOST` | MariaDB hostname | `mariadb` |
| `DB_PORT` | MariaDB port | `3306` |
| `DB_USER` | MariaDB username | `dashboard` |
| `DB_PASSWORD` | MariaDB password | *required* |
| `DB_NAME` | Database name | `dashboard` |
| `ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM | *auto-generated* |

### Service Configuration

Configure API endpoints and credentials from the Settings page:

- **Uptime Kuma** - Status page base URL
- **SuperOps** - Base URL + API key (tickets, alerts, assets, docs)
- **Automation Log** - Log endpoint base URL
- **N8N** - Base URL + API key
- **Proxmox** - Base URL + API token ID + token secret
- **Power BI** - Embed URL for reports
- **SMTP** - Email server for notifications

All service credentials are encrypted with AES-256-GCM before database storage.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/settings/login` | Authenticate and receive JWT token |

### Dashboard Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/data` | Fetch all dashboard data |
| `POST` | `/api/dashboard/create-case` | Create SuperOps ticket |
| `POST` | `/api/dashboard/resolve-alert` | Resolve SuperOps alert |

### Custom Links (authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/custom-links` | Get user's custom links |
| `POST` | `/api/dashboard/custom-links` | Create custom link |
| `PUT` | `/api/dashboard/custom-links/:id` | Update custom link |
| `DELETE` | `/api/dashboard/custom-links/:id` | Delete custom link |

### Settings (authenticated, admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get current configurations |
| `POST` | `/api/settings` | Save configuration |
| `DELETE` | `/api/settings/:service` | Delete configuration |
| `POST` | `/api/settings/test-connection` | Test service connection |

### User Management (authenticated, admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create user |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

### Employee Setup (authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/employee-setup` | List all checklists |
| `POST` | `/api/employee-setup` | Create checklist |
| `GET` | `/api/employee-setup/:id` | Get checklist with items |
| `PATCH` | `/api/employee-setup/:checklistId/items/:itemId` | Update item status |
| `PATCH` | `/api/employee-setup/:id/status` | Update checklist status |
| `DELETE` | `/api/employee-setup/:id` | Delete checklist |

### Asset Columns (authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/asset-columns/columns` | Get column configuration |
| `POST` | `/api/asset-columns/columns` | Save column configuration |
| `POST` | `/api/asset-columns/columns/reset` | Reset to defaults |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (Docker HEALTHCHECK) |

## Project Structure

```
JS-IT-DASHBOARD/
├── server/                          # Backend (Node.js / Express 5)
│   ├── server.js                    # Application entry point
│   ├── db.js                        # MariaDB pool, migrations, seeding
│   ├── healthcheck.js               # Docker health check script
│   ├── reset-admin-password.js      # Admin password reset utility
│   ├── package.json
│   ├── middleware/
│   │   ├── errorHandler.js          # Global error handler, asyncHandler, 404
│   │   └── validation.js            # Input validation middleware
│   ├── routes/
│   │   ├── dashboard.js             # Dashboard data, tickets, alerts, links
│   │   ├── settings.js              # Auth, settings CRUD, connection testing
│   │   ├── users.js                 # User CRUD (admin only)
│   │   ├── employeeSetup.js         # Employee onboarding checklists
│   │   └── assetColumns.js          # Asset column configuration
│   ├── services/
│   │   ├── superOps.js              # SuperOps GraphQL API integration
│   │   ├── uptimeKuma.js            # Uptime Kuma status page scraper
│   │   ├── proxmox.js               # Proxmox VE REST API integration
│   │   ├── n8n.js                   # N8N workflow API integration
│   │   ├── automationLog.js         # Custom automation log endpoint
│   │   ├── powerBI.js               # Power BI embed URL provider
│   │   └── connectionTester.js      # Service connectivity testing
│   ├── utils/
│   │   ├── crypto.js                # AES-256-GCM encrypt/decrypt
│   │   ├── logger.js                # Structured file + console logger
│   │   ├── dbHelpers.js             # dbGet, dbAll, dbRun wrappers
│   │   ├── constants.js             # Application constants
│   │   └── checklistData.js         # Employee setup checklist definitions
│   └── tests/                       # Jest unit & integration tests
│       ├── constants.test.js
│       ├── crypto.test.js
│       ├── dbHelpers.test.js
│       ├── errorHandler.test.js
│       ├── logger.test.js
│       ├── users.test.js
│       ├── settings.test.js
│       ├── dashboard.test.js
│       ├── assetColumns.test.js
│       ├── connectionTester.test.js
│       ├── validation.test.js
│       ├── employeeSetup.test.js
│       ├── employeeSetup401.test.js
│       ├── employeeSetupAutoClose.test.js
│       ├── employeeSetupClosedTicket.test.js
│       └── services/
│           ├── superOps.test.js
│           ├── uptimeKuma.test.js
│           ├── proxmox.test.js
│           ├── n8n.test.js
│           └── automationLog.test.js
├── client/                          # Frontend (React 19 / MUI 7)
│   ├── package.json
│   ├── setupProxy.js               # Dev proxy to backend
│   └── src/
│       ├── App.js                   # Main app with auth, tabs, grid layout
│       ├── App.test.js
│       ├── themes.js                # MUI theme definitions (5 themes)
│       ├── hooks/
│       │   ├── useDashboardTabs.js  # Tab state management hook
│       │   └── useSettingsLayout.js # Settings layout hook
│       └── components/
│           ├── Login.js             # JWT authentication form
│           ├── TabBar.js            # Dashboard tab navigation
│           ├── NetworkStatus.js     # Uptime Kuma down monitors
│           ├── WeeklyUptime.js      # 7-day uptime with reordering
│           ├── MonthlyUptime.js     # 30-day uptime with reordering
│           ├── OpenTickets.js       # SuperOps tickets + creation
│           ├── Alerts.js            # SuperOps alerts + resolve
│           ├── Assets.js            # SuperOps assets + column config
│           ├── SuperOpsDoc.js       # Documentation portal link
│           ├── EmployeeSetup.js     # Kanban onboarding checklists
│           ├── AutomationLogs.js    # Automation log viewer
│           ├── N8NExecutions.js     # N8N workflow history
│           ├── ProxmoxStatus.js     # Proxmox VM/CT monitoring
│           ├── PowerBI.js           # Embedded Power BI reports
│           ├── CustomLinks.js       # Per-user link management
│           ├── Settings.js          # Service configuration panel
│           ├── UserManagement.js    # User CRUD (admin)
│           ├── ThemeSelector.js     # Theme picker
│           ├── ErrorBoundary.js     # React error boundary
│           └── __tests__/           # Component tests
│               ├── Login.test.js
│               ├── NetworkStatus.test.js
│               ├── OpenTickets.test.js
│               └── Settings.test.js
├── Dockerfile                       # Development Docker image
├── Dockerfile.prod                  # Production multi-stage image
├── docker-compose.yml               # Full stack orchestration
├── .env.example                     # Environment variable template
└── README.md
```

## Testing

### Run Backend Tests

```bash
cd server
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
npx jest tests/crypto.test.js --no-coverage   # Run a single test file
```

### Test Coverage

The backend includes 20 test files with 46+ unit and integration tests covering:

- **Utilities** - crypto, logger, dbHelpers, constants
- **Middleware** - errorHandler, validation
- **Routes** - settings, dashboard, users, employeeSetup, assetColumns
- **Services** - superOps, uptimeKuma, proxmox, n8n, automationLog, connectionTester

### Run Frontend Tests

```bash
cd client
npm test                    # Run in watch mode
CI=true npm test            # Run once (CI mode)
```

## Security

| Feature | Implementation |
|---------|---------------|
| Encryption at Rest | AES-256-GCM for all stored credentials |
| Password Hashing | bcryptjs with 10 salt rounds |
| Authentication | JWT tokens with configurable expiration |
| Authorization | Role-based access control (admin/standard) |
| Input Validation | express-validator + custom sanitization |
| SQL Injection | Parameterized queries (mysql2 prepared statements) |
| Rate Limiting | express-rate-limit on all API endpoints |
| Security Headers | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Configurable origin whitelist |
| Protected Admin | Admin account cannot be deleted or renamed |
| User Isolation | Custom links, column prefs, tabs per user |
| Graceful Shutdown | SIGTERM/SIGINT handlers close DB pool cleanly |

## Docker Deployment

### Development

```bash
docker-compose up --build
```

### Production

```bash
docker-compose -f docker-compose.yml up --build -d
```

The production Dockerfile (`Dockerfile.prod`) includes:
- Multi-stage build (build React, then serve from Express)
- `npm ci` for deterministic installs
- Non-root user (`node`)
- `dumb-init` for proper signal handling
- Health check endpoint at `/health`
- Minimized image size with cache cleanup

### Container Architecture

```
┌──────────────────────────┐     ┌──────────────────────┐
│  dashboard (Node.js)     │     │  mariadb (10.11)     │
│  Port 5000               │────>│  Port 3306           │
│  Express + React build   │     │  Persistent volume   │
│  Health: /health         │     │                      │
└──────────────────────────┘     └──────────────────────┘
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection errors | Verify MariaDB container is running and credentials match `.env` |
| API connection failures | Check service URLs and credentials in Settings page |
| Authentication issues | Ensure `JWT_SECRET` is set; try clearing browser localStorage |
| Session expired | Token expired; logout and login again |
| Build failures | Ensure Node.js >= 18; run `npm ci` to clean install |
| Container won't start | Check `docker-compose logs -f dashboard` for errors |
| Admin password reset | Run `node server/reset-admin-password.js` inside the container |

### Viewing Logs

```bash
# Docker logs
docker-compose logs -f dashboard

# Application logs (inside container)
ls /app/logs/
```

## Development

### Adding a New Service Module

1. Create service file in `server/services/yourService.js`
2. Add data fetcher call in `server/routes/dashboard.js`
3. Create React component in `client/src/components/YourModule.js`
4. Register component in `client/src/App.js` module map
5. Add tests in `server/tests/services/yourService.test.js`

### Key Patterns

- **Async/Await** with `asyncHandler` wrapper for route error catching
- **Promise.allSettled** for parallel, fault-tolerant data fetching
- **Connection Pooling** via mysql2 for efficient database access
- **Structured Logging** with file-level JSDoc and timestamped console + file output
- **Database Migrations** run automatically on startup via `db.js`

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm test` in both `server/` and `client/`
5. Submit a pull request
