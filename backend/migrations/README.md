# Database Migrations

This directory contains database migration scripts for the jam-bot backend.

## Running Migrations

### User Roles Migration

To add user roles to existing users:

```bash
cd backend
python migrations/add_user_roles.py
```

This migration:
1. Adds the `role` column to the `user` table if it doesn't exist
2. Sets default role to 'user' for any users without a role
3. Shows summary of user counts by role

### Login Tokens Migration

To add login token fields for passwordless authentication:

```bash
cd backend
python migrations/add_login_tokens.py
```

This migration:
1. Adds the `login_token` column to the `users` table if it doesn't exist
2. Adds the `login_token_expires` column to the `users` table if it doesn't exist
3. Creates an index on the `login_token` column for faster lookups
4. Shows the final table structure for login token columns

## Notes

- The main database initialization happens automatically via `init_db()` in `main.py`
- Migrations in this directory are for one-time data updates or schema changes
- Always backup your database before running migrations in production