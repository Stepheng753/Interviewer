# Agent Skill: SQLite Database Management

This guide covers commands, configurations, and scripts for managing, querying, and preparing to migrate the SQLite database used by **AIU** in development.

---

## 1. Quick Console Operations

Since SQLite uses a simple, local file (`aiu.db`), database administration is straightforward and does not require complex database client installations.

### Querying Data via SQLite CLI
If you have `sqlite3` installed, query tables directly from the command line:

- **List All Registered Users**:
  ```bash
  sqlite3 aiu-backend/aiu.db "SELECT id, name, email, created_at FROM users;"
  ```

- **List Saved Dialogue Pairs for a User (e.g. User ID 1)**:
  ```bash
  sqlite3 aiu-backend/aiu.db "SELECT id, question, answer, timestamp FROM qa_pairs WHERE user_id = 1;"
  ```

- **Truncate Saved History for All Users**:
  ```bash
  sqlite3 aiu-backend/aiu.db "DELETE FROM qa_pairs;"
  ```

---

## 2. Enabling Foreign Keys

By default, SQLite does not enforce foreign key constraints (such as `ON DELETE CASCADE`) unless explicitly configured. You must run this command immediately after opening any database connection in your Node.js code:

```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./aiu.db', (err) => {
  if (err) return console.error('Database connection error:', err);
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
    if (pragmaErr) console.error('Failed to enable foreign keys:', pragmaErr);
  });
});
```

---

## 3. Database Migration: SQLite to PostgreSQL

When moving from local development to production, you will migrate the SQLite database to a production PostgreSQL database.

### Schema Type Conversions

| SQLite DataType | PostgreSQL DataType | Notes |
| :--- | :--- | :--- |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | SQLite autoincrements integers; PostgreSQL uses the `SERIAL` pseudo-type. |
| `TEXT` | `VARCHAR(255)` / `TEXT` | Map emails/names to `VARCHAR`, questions/answers to `TEXT`. |
| `DATETIME DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT NOW()` | Convert time definitions to preserve timestamp timezones in PostgreSQL. |

### Migration Steps
1. **Dump SQLite Data**:
   Extract SQLite database insert scripts (filtered for compatible syntax):
   ```bash
   sqlite3 aiu-backend/aiu.db .dump > sqlite_dump.sql
   ```
2. **Spin Up Postgres**: Install `pg` client dependency and set `DATABASE_URL` in the environment.
3. **Run Schema Definitions**: Execute the DDL schemas using the PostgreSQL client wrapper.
4. **Restore Rows**: Load data using standard migration tools or write a custom Node script to read from SQLite and insert into PostgreSQL.
