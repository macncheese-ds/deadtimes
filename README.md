# Deadtimes

A comprehensive production monitoring and dead time tracking system designed for manufacturing environments. Track, analyze, and reduce equipment downtime with real-time data visualization and historical reporting.

---

## Table of Contents
- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Database](#database)
- [Data Analysis](#data-analysis)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Demo

![Dashboard Demo](docs/demos/dashboard.gif)

---

## Overview

Deadtimes is a full-stack production monitoring application that tracks equipment downtime, analyzes root causes, and provides actionable insights through real-time dashboards and historical reports. Designed for manufacturing facilities to optimize production efficiency and minimize lost time.

---

## Features

- Real-time Equipment Monitoring: Track equipment status and downtime events
- Dead Time Logging: Record and categorize production downtime
- State Management: Monitor different equipment states and transitions
- Production Planning: Analyze production cycles and scheduling impact
- Data Visualization: Interactive charts and dashboards using Recharts
- Excel Reports: Generate and export production reports
- Performance Analytics: Calculate OEE (Overall Equipment Effectiveness) metrics
- Historical Data: Complete audit trail of all equipment events
- User Authentication: Secure access with JWT tokens
- Multi-user Support: Role-based access and user management

---

## Tech Stack

### Backend
- Node.js with Express
- Authentication: JWT (jsonwebtoken), bcryptjs
- Security: Helmet, CORS
- Email/Notifications: Body Parser
- Database: MySQL 2
- Development: Nodemon

### Frontend
- React 18
- Build Tool: Vite
- Styling: Tailwind CSS (v4)
- HTTP Client: Axios
- Routing: React Router DOM
- Charts: Recharts
- Data Export: XLSX
- Icons: Lucide React
- Image Processing: Sharp
- Security: Helmet

### DevOps
- Nginx (reverse proxy)
- Docker & Docker Compose (optional)

---

## Project Structure

```
deadtimes/
├── backend/
│   ├── src/
│   │   ├── routes/           # API endpoint definitions
│   │   ├── middleware/       # Authentication and validation
│   │   ├── controllers/      # Business logic
│   │   └── index.js          # Express server entry point
│   ├── schema_extensions.sql # Database schema
│   ├── add_auditoria_column.sql
│   ├── create_estados_table.sql
│   ├── create_display_column.sql
│   ├── create_produccion_table.sql
│   ├── package.json
│   └── .env                  # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   ├── components/       # React UI components
│   │   ├── pages/            # Page components
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── public/               # Static assets
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── .env                  # Environment variables (not committed)
├── nginx.conf                # Nginx configuration
├── .gitignore
└── README.md
```

---

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd deadtimes

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Configure environment variables
# Create .env files in backend and frontend directories

# Start backend (from backend directory)
npm run dev

# In a new terminal, start frontend (from frontend directory)
npm run dev
```

Then open your browser to `http://localhost:5173` (or the configured Vite port).

---

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MySQL Server
- Nginx (optional, for production)

### Step-by-step Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd deadtimes
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. Initialize the database:
   ```bash
   # Run SQL schema files from backend directory
   # Execute schema_extensions.sql and related files in your MySQL database
   ```

---

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
DATABASE_URL=mysql://user:password@localhost:3306/deadtimes
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d
NODE_ENV=development
LOG_LEVEL=debug
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3000/api
VITE_PORT=5173
```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Production Build

**Backend:**
```bash
cd backend
npm run start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

### With Nginx

Update `nginx.conf` with your server details and run:
```bash
nginx -c <path-to-nginx.conf>
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - New user registration
- `POST /api/auth/refresh` - Refresh JWT token

### Equipment & States
- `GET /api/equipment` - Get all equipment
- `POST /api/equipment` - Create new equipment
- `GET /api/estados` - Get all equipment states
- `POST /api/estados` - Record new equipment state

### Production Data
- `GET /api/produccion` - Get production records
- `POST /api/produccion` - Record produce event
- `GET /api/produccion/:id` - Get specific production record

### Dead Time Events
- `GET /api/deadtimes` - Get all dead time events
- `POST /api/deadtimes` - Record new dead time event
- `GET /api/deadtimes/:id` - Get specific dead time
- `PUT /api/deadtimes/:id` - Update dead time record

### Reports & Analytics
- `GET /api/reports/oee` - Generate OEE report
- `GET /api/reports/downtime` - Get downtime analysis
- `GET /api/reports/export` - Export data to Excel

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

---

## Database

The application uses MySQL with the following main tables:
- Equipment (device configuration and metadata)
- Estados (equipment state logs with timestamps)
- Produccion (production cycle records)
- Deadtimes (downtime event tracking with reasons)
- Users (user accounts and authentication)
- Auditoria (complete audit trail)

Database initialization files are included in the backend directory:
- `schema_extensions.sql`
- `create_estados_table.sql`
- `create_produccion_table.sql`
- `create_display_column.sql`
- `add_auditoria_column.sql`

---

## Data Analysis

### OEE Calculation
The system calculates Overall Equipment Effectiveness based on:
- Availability: Actual production time / Planned production time
- Performance: Ideal cycle time / Actual cycle time
- Quality: Good units / Total units

Access calculations via the Analytics dashboard.

### Reports
Generate comprehensive reports on:
- Equipment downtime by duration
- Root cause analysis
- Production bottlenecks
- Performance trends over time

---

## Development

### Code Style
- Use ES6+ syntax
- Follow consistent naming conventions
- Comment complex logic sections
- Maintain separation of concerns

### Running Diagnostic Tools
```bash
cd backend
node diagnostic.js
node test_api.js
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run start
```

---

## Troubleshooting

### Port Already in Use
If port 3000 or 5173 is in use, update the PORT variable in `.env` files.

### Database Connection Error
- Verify MySQL server is running
- Check DATABASE_URL in backend/.env
- Ensure database exists and credentials are correct
- Run `node diagnostic.js` for database validation

### State Table Issues
If you encounter state-related errors, run:
```bash
cd backend
# Execute the state table creation scripts
mysql -u user -p database_name < create_estados_table.sql
```

### CORS Errors
- Verify VITE_API_URL in frontend/.env matches backend URL
- Check CORS configuration in backend Express settings

### Chart Rendering Issues
- Ensure Recharts is properly installed
- Check data format matches Recharts requirements
- Verify API response structure

### Excel Export Issues
- Ensure XLSX package is installed
- Check file write permissions in backend
- Verify data structure before export attempt

---

## License

This project is proprietary and confidential.

---

## Support

For issues, questions, or feature requests, contact the development team.
