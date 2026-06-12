import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.db import connection
cursor = connection.cursor()

# Disable foreign key constraints
cursor.execute("PRAGMA foreign_keys = OFF")

# Get all table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall() if row[0] != 'sqlite_sequence']

# Drop all tables
for table in tables:
    cursor.execute(f"DROP TABLE IF EXISTS {table}")
    print(f"Dropped table: {table}")

# Re-enable foreign keys
cursor.execute("PRAGMA foreign_keys = ON")

connection.commit()
print("Database cleared completely")


