# Data Connector Platform

## Objective
A containerized web application designed to connect to multiple databases (PostgreSQL, MySQL, MongoDB, ClickHouse), extract and edit data in batches, and securely store it locally via a dual-storage system.

## Setup Instructions

1. Ensure **Docker** and **Docker Compose** are installed and running.
2. In this directory, run:
   ```bash
   docker-compose up -d --build
   ```
   *Note: On the first run, Django models will automatically start, but you may want to enter the backend container to run migrations.*
   ```bash
   docker-compose exec backend python manage.py makemigrations connectors datahub accounts
   docker-compose exec backend python manage.py migrate
   docker-compose exec backend python manage.py createsuperuser
   ```

3. Open `http://localhost:3000` to access the Front-end.
4. Open `http://localhost:8000/admin` to access the Django backend and setup RBAC for your users.

## Dummy Databases Configured
The docker-compose includes:
- `dataconnector_postgres` (Port 5432)
- `dataconnector_target_mysql` (Port 3306)
- `dataconnector_target_mongo` (Port 27017)
- `dataconnector_target_clickhouse` (Port 8123 / 9000)

## Submission Deliverables Process
- Initialize your Git repo: `git init ; git add . ; git commit -m "init"`
- Walkthrough: You can record your application from the browser testing the various pages.
