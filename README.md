# ACTSERV — Data Connector Platform

A full-stack containerized web application that connects to multiple databases (PostgreSQL, MySQL, MongoDB, ClickHouse), extracts and edits data in configurable batches, and securely stores results via a dual-storage system (DB + file).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Vanilla CSS |
| Backend | Django 5.2, Django REST Framework 3.16 |
| Auth | JWT (SimpleJWT) |
| Databases | PostgreSQL, MySQL, MongoDB, ClickHouse |
| Containerization | Docker + Docker Compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose installed and running.

### Setup
```bash
# Clone and start all services
git clone https://github.com/SILVERSTONEBRAV/ACTSERV.git
cd ACTSERV
docker-compose up -d --build

# Run migrations & create admin user
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

### Access Points
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/ |
| Django Admin | http://localhost:8000/admin/ |

## Core Features

### 1. Multi-Database Connector
- Configure connections to PostgreSQL, MySQL, MongoDB, and ClickHouse
- Abstract connector layer (`BaseConnector` → factory pattern) for easy extensibility
- Live connection testing from the UI

### 2. Batch Data Extraction
- Pull data from any configured source with configurable batch sizes
- Real-time progress tracking with system logs
- Support for SQL queries and MongoDB collection names

### 3. Editable Data Grid
- Inline cell editing with row-level change tracking
- Basic validation (e.g., ID fields cannot be empty)
- Global search across all columns
- Data integrity percentage indicator

### 4. Dual Storage
When data is submitted from the grid:
- **Database**: Each row stored as a `ProcessedDataRow` (JSONField)
- **File**: Exported as JSON or CSV with timestamp and source metadata

### 5. Permission & Access Control (RBAC)
- **Admin**: Full access to all files
- **User**: Access to own files + files shared with them
- JWT authentication for all API endpoints
- File sharing via API endpoint

### 6. Dynamic Dashboard Telemetry
- Active Clusters, Sync Latency, Sync Failures, Data Throughput — all computed from real extraction data
- Tabbed interface: Logs, Metrics, Alerts

## Docker Services

| Container | Image | Port |
|---|---|---|
| `dataconnector_postgres` | postgres:15 | 5432 |
| `dataconnector_backend` | Django (custom) | 8000 |
| `dataconnector_frontend` | Next.js (custom) | 3000 |
| `dataconnector_target_mysql` | mysql:8 | 3306 |
| `dataconnector_target_mongo` | mongo:6 | 27017 |
| `dataconnector_target_clickhouse` | clickhouse/clickhouse-server | 8123, 9000 |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET/POST/DELETE | `/api/connectors/` | CRUD database connections |
| POST | `/api/connectors/{id}/extract/` | Batch extraction |
| POST | `/api/datahub/submit/` | Submit edited data (dual storage) |
| GET | `/api/datahub/stats/` | Dynamic telemetry |
| GET | `/api/files/` | List files (RBAC-filtered) |
| GET | `/api/files/{id}/preview/` | Preview file contents |
| GET | `/api/files/{id}/download/` | Download file |
| POST | `/api/files/{id}/share/` | Share file with user |
| POST | `/api/auth/token/` | JWT login |
| POST | `/api/auth/register/` | Registration |
| GET | `/api/auth/me/` | Current user info |

## Testing

```bash
# Run all 27 unit tests
docker-compose exec backend python manage.py test --verbosity=2
```

Tests cover:
- Connector abstraction & factory pattern (7 tests)
- Authentication & RBAC (5 tests)
- Dual storage submit flow (4 tests)
- Data validation (3 tests)
- RBAC file access filtering (4 tests)
- Data model integrity (4 tests)

## Documentation

See [DESIGN_DOCS.md](./DESIGN_DOCS.md) for comprehensive design decisions covering:
- Architecture rationale
- Connector abstraction pattern
- Dual storage strategy
- RBAC implementation
- Frontend state management
- Testing strategy
