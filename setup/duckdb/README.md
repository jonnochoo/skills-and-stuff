# DuckDB

DuckDB is an in-process, columnar SQL database built for fast analytical queries directly
on files like CSV and Parquet, with no server to set up.

DuckDB itself is installed by [setup](../README.md).

## Useful commands

Ignore/exclude columns from a `SELECT *`:

```sql
SELECT * EXCLUDE (column_name, other_column) FROM my_table;
```

Read a CSV, using overloads to control parsing (skip auto-detection, set types, delimiter, etc.):

```sql
-- Quick, auto-detected
SELECT * FROM read_csv_auto('data.csv');

-- Explicit control
SELECT * FROM read_csv('data.csv',
    header = true,
    delim = ',',
    columns = {'id': 'INTEGER', 'name': 'VARCHAR', 'amount': 'DOUBLE'}
);
```

Group by all non-aggregate columns in the `SELECT` list, without listing them (DuckDB-specific):

```sql
SELECT category, region, COUNT(*), SUM(amount)
FROM my_table
GROUP BY ALL;
```
