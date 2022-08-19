#!/usr/bin/env bash

# For testing purposes
psql -c 'CREATE DATABASE test_todos'
psql -d test_todos -f /docker-entrypoint-initdb.d/init.sql
