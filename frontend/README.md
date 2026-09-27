# Task Management App

A full-stack task management application where users can sign in with Google, create tasks, assign tasks to other users, and receive Gmail notifications when tasks are assigned or completed.

## Features

- Google OAuth 2.0 login
- User registration through Google account
- Create tasks with title and description
- Assign tasks to other registered users
- View created and assigned tasks
- Mark tasks as completed
- Gmail notification when a task is assigned
- Gmail notification when a task is completed
- Supabase database
- Flask REST API backend
- Next.js and TypeScript frontend
- Environment variables for sensitive configuration

## Tech Stack

### Frontend
- Next.js
- TypeScript
- React
- Supabase JavaScript Client

### Backend
- Python
- Flask
- Flask-CORS
- Supabase Python Client

### Database
- Supabase PostgreSQL

### Authentication
- Supabase Auth
- Google OAuth 2.0

### Email
- Gmail API

### Deployment
- Vercel
- Railway or Render
- Supabase

## Architecture

```text
                    ┌──────────────────────┐
                    │      User Browser    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Next.js Frontend   │
                    │    TypeScript/React  │
                    └──────────┬───────────┘
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │    Flask Backend     │
                    │      Python API      │
                    └───────┬───────┬──────┘
                            │       │
                ┌───────────┘       └────────────┐
                ▼                                ▼
       ┌─────────────────┐              ┌─────────────────┐
       │    Supabase     │              │    Gmail API    │
       │   PostgreSQL    │              │ Email Service   │
       └─────────────────┘              └─────────────────┘
