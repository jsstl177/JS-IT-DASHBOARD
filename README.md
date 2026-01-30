# JS IT Dashboard

A production-ready, modular, Docker-deployable web dashboard that aggregates IT monitoring data from multiple sources including Uptime Kuma, SuperOps, Proxmox, N8N workflows, and Power BI.

## Features

- **Modular Design**: Drag-and-drop interface to rearrange dashboard sections
- **Multiple Data Sources**: Aggregates data from various IT tools with robust error handling
- **Secure Settings**: Password-protected configuration management with JWT authentication
- **Multiple Themes**: 5 built-in themes (Default, Dark, High Contrast, Blue Ocean, Forest)
- **Docker Deployment**: Production-ready containerized deployment with health checks
- **Real-time Updates**: Automatic data refresh every minute with timeout protection
- **Production Ready**: Comprehensive logging, error handling, rate limiting, and security headers
- **Unit Testing**: Backend API testing with Jest and Supertest
- **Input Validation**: Sanitized inputs and comprehensive validation middleware

## Supported Services

1. **Network Status** (Uptime Kuma) - Shows only down/alerting monitors
2. **Open Cases** (SuperOps) - Displays open tickets
3. **New Employee Setup** - Kanban-style checklist management for employee onboarding
4. **Automation Logs** - Custom log endpoint
5. **N8N Workflow History** - Recent workflow executions
6. **Proxmox Status** - Virtualization host information
7. **Power BI KPI** - Embedded business intelligence reports

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
- `JWT_SECRET`: Secret key for JWT tokens
- `DEFAULT_ADMIN_PASSWORD`: Default admin password for settings
- `NODE_ENV`: Environment mode

### Service Configuration

Access the settings page (password: admin123 by default) to configure API endpoints and credentials for each service:

- **Uptime Kuma**: Base URL of your status page
- **SuperOps**: Base URL and API key
- **Automation Log**: Base URL of log endpoint
- **N8N**: Base URL and API key
- **Proxmox**: Base URL, username, password, and node names (comma-separated in API Key field)
- **Power BI**: Embed URL

## API Endpoints

### Dashboard
- `GET /api/dashboard/data` - Fetch all dashboard data

### Settings Management
- `POST /api/settings/login` - Authenticate for settings access
- `GET /api/settings` - Get current configurations (authenticated)
- `POST /api/settings` - Save configuration (authenticated)
- `DELETE /api/settings/:service` - Delete configuration (authenticated)

### Employee Setup Management
- `GET /api/employee-setup` - Get all employee setup checklists
- `POST /api/employee-setup` - Create new employee setup checklist
- `GET /api/employee-setup/:id` - Get specific checklist with items
- `PATCH /api/employee-setup/:checklistId/items/:itemId` - Update checklist item status
- `PATCH /api/employee-setup/:id/status` - Update checklist status
- `DELETE /api/employee-setup/:id` - Delete checklist

### System
- `GET /health` - Health check endpoint

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

### Adding New Services

1. Create a service file in `server/services/`
2. Add the service to the dashboard route in `server/routes/dashboard.js`
3. Create a React component in `client/src/components/`
4. Add the component to the App.js grid layout

## Security

- API credentials are stored encrypted in SQLite database
- Settings access requires authentication
- JWT tokens for session management
- HTTPS recommended for production deployment

## Troubleshooting

### Common Issues

1. **Database errors**: Ensure write permissions for the database file location
2. **API connection failures**: Check network connectivity and API credentials
3. **Build failures**: Ensure all dependencies are installed and Node.js version is compatible

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