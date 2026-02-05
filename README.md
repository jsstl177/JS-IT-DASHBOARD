# JS IT Dashboard

A production-ready, modular, Docker-deployable web dashboard that aggregates IT monitoring data from multiple sources including Uptime Kuma, SuperOps, Proxmox, N8N workflows, and Power BI.

## Features

- **Multi-User System**: JWT-based authentication with role-based access control
- **User Management**: Admin can create, edit, and delete user accounts
- **Modular Design**: Drag-and-drop interface with multi-tab dashboard organization
- **Multiple Data Sources**: Aggregates data from various IT tools with robust error handling
- **Secure Settings**: Password-protected configuration management with JWT authentication
- **Multiple Themes**: 5 built-in themes (Light, Dark, High Contrast, Blue Ocean, Forest)
- **Custom Links**: User-specific customizable links for quick access
- **Alert Management**: View and resolve alerts with severity-based filtering
- **Ticket Creation**: Submit new tickets directly from the dashboard
- **Docker Deployment**: Production-ready containerized deployment with health checks
- **Real-time Updates**: Automatic data refresh every minute with timeout protection
- **Production Ready**: Comprehensive logging, error handling, rate limiting, and security headers
- **Unit Testing**: Backend API testing with Jest and Supertest
- **Input Validation**: Sanitized inputs and comprehensive validation middleware
- **Customizable Columns**: Configure asset columns, uptime monitor order, and module display names
- **Configurable Refresh**: Adjustable auto-refresh interval with live countdown
- **Tab-Based Layout**: Create multiple dashboard tabs with different module arrangements

## Supported Services & Modules

1. **Network Status** (Uptime Kuma) - Shows only down/alerting monitors
2. **Weekly Uptime** (Uptime Kuma) - Last 7-days uptime statistics with drag-and-drop reordering
3. **Monthly Uptime** (Uptime Kuma) - Last 30-days uptime statistics with drag-and-drop reordering
4. **Open Cases** (SuperOps) - Displays open tickets with ticket creation capability
5. **Alerts** (SuperOps) - Active alerts with severity-based filtering and resolve functionality
6. **Assets** (SuperOps) - Asset inventory with customizable column configuration
7. **SuperOps Documentation** - Quick access to IT documentation portal
8. **New Employee Setup** - Kanban-style checklist management for employee onboarding
9. **Automation Logs** - Custom log endpoint for monitoring automation status
10. **N8N Workflow History** - Recent workflow executions with status tracking
11. **Proxmox Status** - Virtualization host information and resource monitoring
12. **Power BI KPI** - Embedded business intelligence reports
13. **Custom Links** - User-specific customizable link management

## New Employee Setup Module

The dashboard includes a specialized Kanban-style card system for tracking new employee setup progress. This module automatically creates checklists based on the comprehensive setup process for new hires, including:

- **Outlook Email** configuration
- **JEN** user setup
- **JU Online** account creation
- **Domain** user provisioning
- **INFORM** system access
- **UPG Navigator** and Goodman toolkit setup
- **Dashlane** password management
- **CDA Alarm** system access
- **Salto's** electronic access control
- **M365** license assignment
- **Distribution groups** and **Vonage VBC** setup

### Features:
- ✅ **Interactive Checklists**: Check off completed items or mark as N/A
- ✅ **Progress Tracking**: Visual progress indicators for each employee
- ✅ **Category Organization**: Items grouped by system/category with expandable sections
- ✅ **Status Management**: Automatic status updates (Pending → In Progress → Completed)
- ✅ **Ticket Integration**: Link to existing IT tickets for tracking

## Asset Module Configuration

The Assets module provides a fully customizable table view with configurable columns stored in MariaDB. This feature allows you to customize which asset fields are displayed and their order according to your preferences.

### Available Asset Fields

1. **Name** - Asset name (default visible)
2. **Host** - Hostname (default visible)
3. **Last Logged In By** - Last logged-in user (default visible)
4. **Platform** - Operating system/platform (default visible)
5. **Status** - Asset status with color-coded chips (default visible)
6. **Patch Status** - Current patch status (default visible)
7. **Last Seen** - Last communication time (default visible)
8. **Asset Class** - Asset classification (optional)
9. **Client** - Associated client (optional)
10. **Site** - Physical location/site (optional)
11. **Serial Number** - Device serial number (optional)
12. **Manufacturer** - Device manufacturer (optional)
13. **Model** - Device model (optional)

### Features:
- ✅ **Dynamic Column Rendering**: Table columns render based on user preferences
- ✅ **Persistent Storage**: Column configurations stored in MariaDB database
- ✅ **Easy Configuration**: Click the gear icon to open configuration dialog
- ✅ **Show/Hide Columns**: Check/uncheck boxes to toggle column visibility
- ✅ **Column Reordering**: Use drag handles to reorder columns
- ✅ **Reset to Defaults**: Restore original column configuration anytime
- ✅ **Enhanced Search**: Search across all available asset fields
- ✅ **JWT Secured**: All column configuration endpoints require authentication

### Usage

1. **Access Configuration**: Click the gear icon in the Assets module header
2. **Toggle Visibility**: Check/uncheck boxes next to column names
3. **Reorder Columns**: Use the drag handle icons to reorder columns up/down
4. **Save Changes**: Click "Save" to apply your configuration
5. **Reset Defaults**: Click "Reset to Defaults" to restore original settings

### Search Functionality

The search bar now searches across all 13 available asset fields, not just visible columns, making it easy to find assets regardless of your current column configuration.

## User Management

The dashboard includes a comprehensive multi-user authentication system with the following features:

### Features:
- ✅ **JWT Authentication**: Secure token-based authentication system
- ✅ **User CRUD Operations**: Create, read, update, and delete users (admin only)
- ✅ **Password Security**: Bcrypt password hashing with minimum 8-character requirement
- ✅ **Role-Based Access**: Admin and standard user roles
- ✅ **Session Management**: Automatic token expiration and refresh
- ✅ **Protected Admin User**: Admin user cannot be deleted or have username changed

### Admin Capabilities:
1. **Create Users**: Add new users with username and password
2. **Edit Users**: Update usernames and reset passwords
3. **Delete Users**: Remove users (except admin and self)
4. **View All Users**: See complete user list with creation timestamps

### User-Specific Features:
- **Custom Links**: Each user maintains their own set of custom links
- **Column Preferences**: Personal asset column configuration per user
- **Tab Layouts**: Individual dashboard tab arrangements and layouts

## Dashboard Features

### Alerts Module
The Alerts module provides comprehensive alert monitoring with actionable controls:
- ✅ **Severity Levels**: Critical, High, Medium, Low, Info with color-coded chips
- ✅ **Alert Details**: Asset, policy, status, and timestamp information
- ✅ **Resolve Functionality**: One-click alert resolution with confirmation
- ✅ **Auto-Sorting**: Alerts sorted by creation time (newest first)
- ✅ **Visual Indicators**: Border colors and icons based on severity
- ✅ **External Links**: Direct links to alert details in SuperOps

### Custom Links Module
User-specific link management for quick access to frequently used resources:
- ✅ **CRUD Operations**: Create, read, update, and delete custom links
- ✅ **URL Validation**: Ensures valid URLs are entered
- ✅ **User Isolation**: Each user has their own set of links
- ✅ **Card Layout**: Clean, organized card-based display
- ✅ **Quick Actions**: Edit, delete, and open links in new tabs

### Uptime Tracking
Weekly and Monthly uptime modules with advanced features:
- ✅ **Drag-and-Drop Reordering**: Customize monitor display order
- ✅ **Persistent Order**: Saved order preserved in browser localStorage
- ✅ **Priority Sorting**: Automatic priority for WAN/AT&T monitors
- ✅ **Visual Progress Bars**: Color-coded progress indicators (success/warning/error)
- ✅ **Percentage Display**: Precise uptime percentages to 2 decimal places

### Multi-Tab Dashboard
Flexible dashboard organization with customizable tabs:
- ✅ **Multiple Tabs**: Create unlimited dashboard tabs
- ✅ **Tab Management**: Rename, reorder, and delete tabs
- ✅ **Module Assignment**: Drag modules between tabs
- ✅ **Responsive Grid**: Drag-and-drop, resizable widget layouts
- ✅ **Layout Persistence**: Tab configurations saved per browser
- ✅ **Module Display Names**: Customize module titles per user preference

### SuperOps Integration
Enhanced SuperOps integration beyond basic data display:
- ✅ **Create Tickets**: Submit new tickets directly from dashboard
- ✅ **Resolve Alerts**: Mark alerts as resolved via API
- ✅ **Documentation Access**: Quick link to IT documentation portal
- ✅ **Asset Search**: Search across all 13 asset fields
- ✅ **Column Customization**: Configure which asset columns to display

### Configurable Refresh
Dashboard auto-refresh with user control:
- ✅ **Adjustable Interval**: Set refresh interval from settings (default: 60 seconds)
- ✅ **Live Countdown**: Visual countdown timer in header
- ✅ **Auto-Retry**: Failed requests automatically retry after 10 seconds
- ✅ **Cross-Tab Sync**: Refresh interval synced across browser tabs

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/jsstl177/JS-IT-DASHBOARD.git
cd JS-IT-DASHBOARD
```

2. Create environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build and run:
```bash
docker-compose up --build
```

4. Access the dashboard at http://localhost:5000

### Manual Installation

1. Install dependencies:
```bash
cd server && npm install
cd ../client && npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the backend:
```bash
cd server && npm start
```

4. In another terminal, start the frontend:
```bash
cd client && npm start
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 5000)
- `JWT_SECRET`: Secret key for JWT tokens (required for authentication)
- `DEFAULT_ADMIN_PASSWORD`: Default admin password (default: admin123)
- `NODE_ENV`: Environment mode (development/production)
- `DB_HOST`: MariaDB host (default: mariadb)
- `DB_USER`: MariaDB username
- `DB_PASSWORD`: MariaDB password
- `DB_NAME`: Database name (default: dashboard)

### Authentication

Default admin credentials:
- **Username**: admin
- **Password**: admin123 (or value of `DEFAULT_ADMIN_PASSWORD` environment variable)

After first login, it's recommended to:
1. Change the admin password from User Management settings
2. Create individual user accounts for team members

### Service Configuration

Access the settings page to configure API endpoints and credentials for each service:

- **Uptime Kuma**: Base URL of your status page
- **SuperOps**: Base URL and API key (supports ticket creation, alert resolution, assets, and documentation)
- **Automation Log**: Base URL of log endpoint
- **N8N**: Base URL and API key
- **Proxmox**: Base URL, API token ID, and token secret
- **Power BI**: Embed URL for reports

**Note**: All service credentials are encrypted using AES-256-GCM before storage in the database.

## API Endpoints

### Dashboard
- `GET /api/dashboard/data` - Fetch all dashboard data

### Settings Management
- `POST /api/settings/login` - Authenticate for settings access
- `GET /api/settings` - Get current configurations (authenticated)
- `POST /api/settings` - Save configuration (authenticated)
- `DELETE /api/settings/:service` - Delete configuration (authenticated)

### User Management
- `GET /api/users` - Get all users (admin only, authenticated)
- `POST /api/users` - Create new user (admin only, authenticated)
- `PUT /api/users/:id` - Update user (admin only, authenticated)
- `DELETE /api/users/:id` - Delete user (admin only, authenticated)
- `POST /api/settings/login` - User authentication (returns JWT token)

### Employee Setup Management
- `GET /api/employee-setup` - Get all employee setup checklists
- `POST /api/employee-setup` - Create new employee setup checklist
- `GET /api/employee-setup/:id` - Get specific checklist with items
- `PATCH /api/employee-setup/:checklistId/items/:itemId` - Update checklist item status
- `PATCH /api/employee-setup/:id/status` - Update checklist status
- `DELETE /api/employee-setup/:id` - Delete checklist

### Dashboard Operations
- `POST /api/dashboard/create-case` - Create new SuperOps ticket
- `POST /api/dashboard/resolve-alert` - Resolve a SuperOps alert
- `GET /api/dashboard/custom-links` - Get user's custom links (authenticated)
- `POST /api/dashboard/custom-links` - Create custom link (authenticated)
- `PUT /api/dashboard/custom-links/:id` - Update custom link (authenticated)
- `DELETE /api/dashboard/custom-links/:id` - Delete custom link (authenticated)

### Asset Column Configuration
- `GET /api/asset-columns/columns` - Get column configuration for user (authenticated)
- `POST /api/asset-columns/columns` - Save column configuration (authenticated)
- `POST /api/asset-columns/columns/reset` - Reset column configuration to defaults (authenticated)

### System
- `GET /health` - Health check endpoint

## Code Quality & Documentation

### Documentation
- **JSDoc Comments**: All server-side code includes comprehensive JSDoc documentation
  - Utility functions (`crypto.js`, `logger.js`, `dbHelpers.js`, `constants.js`)
  - Service modules (SuperOps, Uptime Kuma, Proxmox, N8N, Power BI, Automation Log)
  - Middleware (error handlers, validation)
  - Clear parameter and return type documentation

### Error Handling
- **Global Error Handler**: Centralized error handling with proper HTTP status codes
- **Async Handler Wrapper**: Catches errors in async route handlers
- **Service-Level Error Handling**: Each service gracefully handles API failures
- **Validation Middleware**: Input validation for all endpoints
- **Timeout Protection**: API calls have configurable timeouts
- **Graceful Degradation**: Dashboard continues to function even when services are unavailable

### Testing
- **Unit Tests**: Comprehensive test coverage for:
  - All service modules (SuperOps, Uptime Kuma, Proxmox, N8N, etc.)
  - Route handlers (dashboard, settings, employee setup, asset columns)
  - Validation middleware
  - Cryptographic utilities
  - Database helpers
- **Test Framework**: Jest with Supertest for API testing
- **Run Tests**: `cd server && npm test`
- **Coverage Report**: `cd server && npm run test:coverage`

### Security Features
- **AES-256-GCM Encryption**: Sensitive data encrypted at rest
- **JWT Authentication**: Secure token-based authentication
- **Input Sanitization**: All inputs validated and sanitized
- **Parameterized Queries**: SQL injection prevention
- **Rate Limiting**: API rate limiting to prevent abuse
- **Security Headers**: Helmet.js for security headers
- **Environment Variables**: Secrets managed via environment variables

## Development

### Project Structure

```
├── server/                 # Backend Node.js/Express
│   ├── routes/            # API routes
│   ├── services/          # Data fetching services
│   ├── db.js             # Database configuration
│   └── server.js         # Main server file
├── client/                # Frontend React app
│   └── src/
│       ├── components/    # React components
│       └── App.js         # Main React app
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
└── README.md            # This file
```

### Code Organization

**Server Architecture:**
- `routes/` - Express route handlers with authentication
- `services/` - External API integration modules
- `middleware/` - Express middleware (error handling, validation)
- `utils/` - Utility functions (crypto, logging, database, constants)
- `tests/` - Jest unit and integration tests

**Key Patterns:**
- **Async/Await**: All async operations use async/await with proper error handling
- **Promise.allSettled**: Dashboard data fetching uses Promise.allSettled for fault tolerance
- **Connection Pooling**: MySQL connection pool for efficient database access
- **Logging**: Structured logging with Winston-style logger
- **Configuration**: Database-backed configuration with encryption

### Adding New Services

1. Create a service file in `server/services/`
2. Add the service to the dashboard route in `server/routes/dashboard.js`
3. Create a React component in `client/src/components/`
4. Add the component to the App.js grid layout

## Security

- **AES-256-GCM Encryption**: All API credentials encrypted at rest in MariaDB
- **JWT Authentication**: Secure token-based user authentication
- **Bcrypt Password Hashing**: User passwords hashed with bcrypt (10 rounds)
- **Role-Based Access Control**: Admin-only endpoints for user and settings management
- **User Data Isolation**: Custom links and preferences isolated per user
- **Input Validation**: Comprehensive validation and sanitization on all endpoints
- **SQL Injection Prevention**: Parameterized queries throughout application
- **Rate Limiting**: API rate limiting to prevent abuse
- **Security Headers**: Helmet.js configured for security headers
- **Session Management**: JWT tokens with expiration and automatic refresh
- **Protected Admin**: Admin user cannot be deleted or have username changed
- **HTTPS Recommended**: Use HTTPS for production deployment

## Troubleshooting

### Common Issues

1. **Database errors**: Ensure MariaDB container is running and accessible
2. **API connection failures**: Check network connectivity and API credentials in Settings
3. **Build failures**: Ensure all dependencies are installed and Node.js version is compatible
4. **Authentication issues**: Verify JWT_SECRET environment variable is set
5. **Column configuration not saving**: Verify JWT authentication is working and check server logs
6. **Session expired errors**: Token may have expired; logout and login again
7. **Custom links not saving**: Ensure user is authenticated and check browser console for errors

### Logs

Check Docker logs:
```bash
docker-compose logs -f dashboard
```

Or application logs in the container console.

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request