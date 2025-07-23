# Picture Perfect TV Install

A professional home service platform specializing in TV mounting and smart home installations across Metro Atlanta, providing a seamless and intuitive booking experience with robust technological infrastructure.

## Features

- Responsive, modern React + TypeScript frontend
- PostgreSQL with Drizzle ORM for efficient data management
- Framer Motion for interactive, engaging animations
- Wouter for smooth, single-page routing
- SendGrid for transactional email communications
- Comprehensive admin panel with advanced management tools
- Smart home device integration with detailed installation tracking

## Running in Development

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`
4. The application will be available at http://localhost:5000

## Deployment to Production

The application is configured to be easily deployed to production environments. There are two main scripts for deployment:

### Option 1: Full Build and Run

Run the `build-and-run.sh` script which:
1. Installs all dependencies
2. Builds the application
3. Starts the server in production mode

```bash
./build-and-run.sh
```

### Option 2: Run Pre-built Application

If you've already built the application, you can use the `serve-production.sh` script to start the server:

```bash
./serve-production.sh
```

## Environment Configuration

The application uses the following environment variables:

- `PORT`: The port where the application will run (defaults to 5000)
- `NODE_ENV`: Set to 'production' for production mode
- `DATABASE_URL`: PostgreSQL connection string

## Admin Access

The admin panel is available at `/admin`. Default credentials:
- Password: See environment variable or ask administrator

## License

Copyright (c) 2025 Picture Perfect TV Install