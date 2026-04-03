# Design Decisions — ACTSERV Data Connector Platform

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Frontend: Next.js + Vanilla CSS](#2-frontend-nextjs--vanilla-css)
3. [Backend: Django REST Framework & Connector Abstraction](#3-backend-django-rest-framework--connector-abstraction)
4. [Batch Data Extraction](#4-batch-data-extraction)
5. [Editable Data Grid](#5-editable-data-grid)
6. [Dual Storage Pattern](#6-dual-storage-pattern)
7. [Permission & Access Control (RBAC)](#7-permission--access-control-rbac)
8. [Containerization Strategy](#8-containerization-strategy)
9. [Frontend State & UX Enhancements](#9-frontend-state--ux-enhancements)
10. [Dynamic Telemetry & Stats](#10-dynamic-telemetry--stats)
11. [Testing Strategy](#11-testing-strategy)

---

## 1. Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│   Next.js 16    │────▶│  Django REST API  │────▶│   Target Databases      │
│   (Port 3000)   │ JWT │  (Port 8000)      │     │  PostgreSQL (5432)      │
│                 │◀────│                   │     │  MySQL      (3306)      │
│  App Router     │     │  connectors/      │     │  MongoDB    (27017)     │
│  Vanilla CSS    │     │  datahub/         │     │  ClickHouse (8123)      │
│  React 19       │     │  accounts/        │     └─────────────────────────┘
└─────────────────┘     └──────────────────┘
                               │
                        ┌──────┴──────┐
                        │ Platform DB │
                        │ PostgreSQL  │
                        │ (5432)      │
                        └─────────────┘
```

**Why this architecture?**
- **Separation of concerns**: The Next.js frontend handles UI rendering and client-side state, while DRF handles data validation, storage, and connector management.
- **Independent scaling**: Frontend and backend containers can be scaled independently.
- **Hot-reload in development**: Both containers mount source directories as volumes for instant feedback during development.

---

## 2. Frontend: Next.js + Vanilla CSS

### Why Next.js?
- **Requirement**: The assessment explicitly mandates Next.js.
- **App Router**: We use Next.js App Router for file-system-based routing (`/config`, `/extract`, `/grid`, `/files`, `/settings`, `/support`), giving us clean URL semantics with zero configuration.
- **React 19**: Leverages the latest React features for state management and rendering.

### Why Vanilla CSS over Tailwind?
We avoided Tailwind to demonstrate mastery of fundamental CSS architecture. Instead, we built a complete **"Luminous Architect" design system** from scratch in `globals.css`:

- **CSS Custom Properties**: Over 30 design tokens (`--primary`, `--surface`, `--radius-md`, etc.) enabling instant theme switching between light and dark modes via `[data-theme]` selectors.
- **Component Classes**: `.card`, `.stat-card`, `.btn`, `.input-field`, `.chip`, `.data-table` — all purpose-built for the platform's aesthetic.
- **Responsive Layout**: CSS Grid (`grid-2`, `grid-3`) with `@media` breakpoints for mobile adaptation.
- **Micro-animations**: Fade-in transitions, hover effects on cards, and smooth theme toggle transitions.

### Page Architecture

| Route | Purpose |
|---|---|
| `/` | Dashboard — Operational overview with dynamic stats, tabbed Logs/Metrics/Alerts, and active connections |
| `/config` | Connection Architecture — CRUD for database connections with live testing |
| `/extract` | Data Extraction — Query builder + batch size config with real-time progress |
| `/grid` | Editable Data Grid — Inline cell editing with validation, search, and dual-format export |
| `/files` | Storage — RBAC-filtered file manifest with instant preview and download |
| `/settings` | Global Settings — Profile management and system preferences |
| `/support` | Platform Support — Ticket submission and documentation links |
| `/login` | Authentication — JWT login and registration |

---

## 3. Backend: Django REST Framework & Connector Abstraction

### Why DRF?
- **Requirement**: The assessment mandates Django REST Framework.
- **Mature ecosystem**: Built-in serializers, viewsets, routers, and permission classes reduce boilerplate dramatically.
- **JWT authentication**: `djangorestframework-simplejwt` integrates seamlessly with DRF's authentication backends.

### Connector Abstraction Layer

The core extensibility requirement is satisfied through the **Abstract Factory pattern** in `connectors/services.py`:

```python
class BaseConnector(ABC):
    @abstractmethod
    def connect(self): pass

    @abstractmethod
    def extract_batch(self, query, batch_size, offset): pass
```

**Concrete implementations:**
| Class | DB | Driver |
|---|---|---|
| `PostgresConnector` | PostgreSQL | `psycopg2` with `RealDictCursor` |
| `MySQLConnector` | MySQL | `PyMySQL` with `DictCursor` |
| `MongoConnector` | MongoDB | `pymongo` (collection-based queries) |
| `ClickHouseConnector` | ClickHouse | `clickhouse-connect` |

**Factory function:**
```python
def extract_data_with_connector(connection_config, query, batch_size, offset):
    connector_classes = {
        'POSTGRES': PostgresConnector,
        'MYSQL': MySQLConnector,
        'MONGO': MongoConnector,
        'CLICKHOUSE': ClickHouseConnector
    }
    cls = connector_classes.get(connection_config.db_type)
    if not cls:
        raise ValueError("Unsupported Database Type")
    return cls(connection_config).extract_batch(query, batch_size, offset)
```

**Why this approach over alternatives?**
- **Strategy Pattern**: Each connector encapsulates its connection logic (URI format, cursor type, pagination syntax) independently.
- **Open/Closed Principle**: Adding a 5th database (e.g., Redis, CockroachDB) requires only: (1) create a new class inheriting `BaseConnector`, (2) add one entry to the factory mapping. Zero changes to existing code.
- **Alternative rejected — Django ORM multi-db**: Using Django's built-in multi-database routing would have been more opinionated but would restrict us to SQL databases only, excluding MongoDB.

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST/DELETE | `/api/connectors/` | CRUD for database connections |
| POST | `/api/connectors/{id}/extract/` | Execute batch extraction against a connection |
| POST | `/api/datahub/submit/` | Submit edited data (dual storage) |
| GET | `/api/datahub/stats/` | Dynamic telemetry metrics |
| GET | `/api/datahub/records/` | List processed data records |
| GET | `/api/files/` | List files (RBAC-filtered) |
| GET | `/api/files/{id}/preview/` | Preview file contents |
| GET | `/api/files/{id}/download/` | Download exported file |
| POST | `/api/files/{id}/share/` | Share a file with another user |
| POST | `/api/auth/token/` | JWT login |
| POST | `/api/auth/token/refresh/` | Refresh JWT |
| POST | `/api/auth/register/` | User registration |
| GET | `/api/auth/me/` | Current user info |

---

## 4. Batch Data Extraction

### How it works:
1. User selects a configured connection from the dropdown.
2. User writes a SQL query (or MongoDB collection name).
3. User sets batch size (default 50, range 1–10000).
4. Frontend calls `POST /api/connectors/{id}/extract/` with `{ query, batch_size, offset }`.
5. Backend instantiates the appropriate connector, executes paginated query, returns results.
6. Frontend stores data in `localStorage` and navigates to the Grid page.

### Why localStorage for inter-page data transfer?
- **No global state management library**: We intentionally avoided Redux/Zustand to keep the architecture lean. For an assessment of this scope, `localStorage` provides a simple, reliable bridge between the Extraction and Grid pages.
- **Alternative considered**: React Context. Rejected because it would lose state on page refresh, which is undesirable during data editing sessions.

---

## 5. Editable Data Grid

### Features implemented:
- **Dynamic column detection**: Columns are inferred from the first row's keys, supporting any schema.
- **Inline editing**: Every cell is a live `<input>` element bound to React state.
- **Row modification tracking**: A `Set<number>` tracks which row indices have been edited, visually highlighted with a primary-colored left border.
- **Basic validation**: ID fields cannot be empty — errors are displayed inline with red borders and tooltips.
- **Search/filter**: A global search bar filters across all columns in real-time.
- **Dual-format export**: "Submit JSON" and "Export CSV" buttons both call the same backend endpoint with different `format` parameters.

### Why not a library like AG Grid or React Table?
- **Assessment scope**: The spec asks for inline editing, row updates, and basic validation — all achievable with native HTML inputs and React state.
- **Full control**: Custom styling matches our Luminous Architect design system perfectly without fighting library CSS.

---

## 6. Dual Storage Pattern

When the user submits edited data from the Grid:

### A. Database Storage
```python
for row in rows:
    ProcessedDataRow.objects.create(
        source_connection=connection,
        payload=row  # JSONField
    )
```
- Each row is stored as a `ProcessedDataRow` with a JSON payload, preserving the full schema flexibility.
- The `source_connection` foreign key maintains provenance tracking.

### B. File Storage
```python
# JSON format
json.dump({'metadata': metadata, 'data': rows}, f, indent=2)

# CSV format  
writer = csv.DictWriter(f, fieldnames=rows[0].keys())
writer.writeheader()
writer.writerows(rows)
```

**File metadata includes:**
- `timestamp` — ISO 8601 export time
- `source_db_name` — Connection name
- `source_db_type` — Database engine type
- `source_host` / `source_port` — Network coordinates
- `row_count` — Number of exported rows
- `exported_by` — Authenticated username

**Why this approach?**
- **Decoupling**: File generation is independent of the database transaction. If the DB corrupts, the flat files serve as recovery artifacts.
- **Audit trail**: Each file is a timestamped snapshot that cannot be retroactively modified.
- **Docker volume**: Files persist in a named Docker volume (`data_exports`), surviving container restarts.

---

## 7. Permission & Access Control (RBAC)

### Model Design
```python
class DataFile(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_files')
    shared_with = models.ManyToManyField(User, related_name='shared_files', blank=True)
```

### Access Rules
| Role | Access |
|---|---|
| **Admin** (`is_staff` / `is_superuser`) | Full visibility — sees all files |
| **User** | Own files + files explicitly shared with them |

### Implementation
```python
def get_queryset(self):
    user = self.request.user
    if user.is_staff or user.is_superuser:
        return DataFile.objects.all()
    return DataFile.objects.filter(
        Q(owner=user) | Q(shared_with=user)
    ).distinct()
```

### Why Django's built-in User model?
- **Simplicity**: The assessment doesn't require custom user fields. Django's `User` model provides `is_staff`, `is_superuser`, and the auth backend out of the box.
- **Share endpoint**: `POST /api/files/{id}/share/` allows file owners and admins to share files with specific users by ID.

### JWT Authentication
- **Token-based**: `djangorestframework-simplejwt` issues access/refresh token pairs.
- **Why JWT over session auth?**: JWT is stateless and works naturally with the separate frontend container — no cookie domain issues.

---

## 8. Containerization Strategy

### Docker Compose Services

| Service | Image | Purpose |
|---|---|---|
| `platform-db` | `postgres:15` | Platform's own database (stores connections, files, users) |
| `backend` | Custom Django | DRF API server |
| `frontend` | Custom Next.js | UI server |
| `target-mysql` | `mysql:8` | Test target database |
| `target-mongo` | `mongo:6` | Test target database |
| `target-clickhouse` | `clickhouse/clickhouse-server` | Test target database |

### Key Design Decisions
- **Volume mounts for hot-reload**: Source directories are mounted into containers, so code changes reflect immediately without rebuilding.
- **Named volumes for persistence**: `postgres_data` and `data_exports` survive `docker-compose down`.
- **Environment-driven config**: `DATABASE_URL` is parsed at runtime, allowing the same Django code to run locally (SQLite) or in Docker (PostgreSQL).
- **No target PostgreSQL container**: The platform's own PostgreSQL container doubles as a testable PostgreSQL target, avoiding duplicate containers.

---

## 9. Frontend State & UX Enhancements

### Global Toast Notification Context
A centralized `ToastProvider` wraps the entire application, providing `addToast(message, type)` to any component via `useToast()`. This replaces brittle `window.alert()` calls with animated, auto-dismissing notifications.

### Skeleton Loaders
A dedicated `<Skeleton />` component provides loading shimmer effects that prevent Cumulative Layout Shift (CLS) during data fetches.

### App Shell Navigation
The `AppShell` component provides:
- **Responsive sidebar**: Collapsible on mobile with hamburger toggle and overlay.
- **Top bar**: Context-aware tabs (Logs/Metrics/Alerts on Dashboard, "Back to Dashboard" link on other pages).
- **Theme toggle**: Dark/light mode persisted to `localStorage`.
- **Active route highlighting**: Sidebar links reflect the current pathname.

---

## 10. Dynamic Telemetry & Stats

All dashboard statistics are computed dynamically from real data:

| Metric | Calculation |
|---|---|
| **Active Clusters** | `DatabaseConnection.objects.count()` |
| **Sync Latency** | Average of `extraction_time_ms` across all `DataFile` records |
| **Sync Failures** | Count of `DataFile` records with `status='FAILED'` |
| **Data Throughput** | `total_bytes / total_time_ms * 1000`, auto-formatted to B/s, KB/s, MB/s, or GB/s |

These metrics are served from `GET /api/datahub/stats/` and consumed by both the Dashboard and Connections pages.

### Telemetry Fields on DataFile
```python
status = models.CharField(max_length=20, default='SUCCESS', choices=(...))
extraction_time_ms = models.IntegerField(default=0)
file_size_bytes = models.IntegerField(default=0)
```

---

## 11. Testing Strategy

### Test Coverage: 27 tests across 3 apps

#### `accounts/tests.py` (5 tests)
- User registration via API
- JWT token generation
- Protected endpoint requires auth (401)
- Authenticated access succeeds
- Current user endpoint returns correct data

#### `connectors/tests.py` (7 tests)
- `BaseConnector` is properly abstract (cannot instantiate)
- Factory rejects unsupported DB types
- Factory resolves all 4 supported DB types to correct classes
- Model creation and string representation
- Type choices validation
- API: list, create, delete connectors

#### `datahub/tests.py` (15 tests)
- **Model tests**: ProcessedDataRow creation, DataFile creation with defaults, file sharing via M2M
- **Dual storage tests**: Submit creates DB records, submit creates file on disk, file contains metadata with timestamp and source info, CSV format export works, telemetry fields populated
- **Validation tests**: Empty rows rejected (400), invalid empty-dict rows rejected (400), nonexistent connection rejected (400)
- **RBAC tests**: Admin sees all files, user sees only own files, user sees shared files, unauthenticated access blocked (401)

### Why these tests?
Each test maps directly to a core assessment requirement:
- **Dual storage** → Requirement 5
- **Validation** → Requirement 4 ("Backend should validate data")
- **RBAC** → Requirement 6 ("Role-based access")
- **Connector abstraction** → Requirement 1 ("Extensible design")
