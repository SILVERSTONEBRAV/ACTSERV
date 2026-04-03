# Design Decisions

## 1. Why Next.js + Vanilla CSS for the Frontend?
We avoided Tailwind as per the constraint: "Avoid using TailwindCSS unless the USER explicitly requests it". 
Next.js provides an extremely solid routing paradigm (App Router) combined with API fetching ease. The "Luminous Architect" design system (off-centered alignments, deep-sea `#0b1326` backgrounds, etc.) was strictly applied via standard CSS modules/globals, proving we can replicate highly intentional, premium aesthetics perfectly without utility libraries.

## 2. Django REST Framework & Connector Abstraction
The requirements demanded extensibility. We achieved this by implementing an abstract standard (`BaseConnector`) in `connectors/services.py`. 
- **Why?** Passing parameters like `batch_size` and `offset` dynamically means all concrete DB connectors (Postgres, MySQL, Mongo, ClickHouse) must expose uniform interfaces. If a 5th DB like Redis is required later, a developer simply inherits `BaseConnector`, overwrites the `.extract_batch()` method, and updates the factory mapping.

## 3. Dual Storage Pattern
To fulfill the requirement of saving structured records in a DB *while* keeping a flat JSON/CSV file:
- **Strategy chosen:** Backend-managed file writing. When `POST /api/datahub/submit/` receives edited data, it first performs bulk DB inserts inside `ProcessedDataRow` keeping the JSON robustly searchable. Immediately after, it generates an export timestamp file in the `/data_exports/` Docker volume directory.
- **Why?** Decoupling the file generation prevents database load and guarantees recovery if the DB corrupts.

## 4. Permission Access Control (RBAC) via Django Models
Instead of writing a custom RBAC engine, we mapped the files to Django's built in `User` model, registering a `owner` and a `shared_with` M2M relation to the `DataFile`. 
- **Security Check:** ViewSets dynamically filter queries (`filter(owner=user) | filter(shared_with=user)`) ensuring users *only* see what their access tokens authorize. Administrators (`is_staff` or `is_superuser`) automatically override.

## 5. Frontend State & UX Enhancements
To adhere to modern UI performance heuristics and Luminous Architect aesthetics, we introduced global contexts instead of scattered ad-hoc components:
- **Global Toast Notification Context**: A centralized system that queues and dismisses user feedback universally across requests, abstracting away brittle window.alert() commands.
- **Skeleton Loaders**: Dedicated <Skeleton /> modules implemented to signal data retrieval states to users without abruptly shifting layouts (Cumulative Layout Shift) allowing for smooth perceived performance.
- **App Shell Navigation**: Responsive wrapping with CSS-orchestrated sidebars and glassmorphic micro-animations.

