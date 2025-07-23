# Picture Perfect TV Install

A professional home service platform specializing in TV mounting and smart home installations across Metro Atlanta.

## Production Deployment

### Environment Variables Required

```
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=production
PORT=5000
```

### Build & Deploy

1. Install dependencies:
```bash
npm install
```

2. Build the application:
```bash
npm run build
```

3. Start production server:
```bash
npm run start
```

### Railway/Render Deployment

This project is ready for deployment on Railway or Render. Ensure the following:

- Set `NODE_ENV=production` in environment variables
- Configure `DATABASE_URL` with your PostgreSQL connection string
- The build command is: `npm run build`
- The start command is: `npm run start`
- Uses port 5000 (configurable via PORT environment variable)

### Tech Stack

- **Frontend**: React + TypeScript, Vite
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: Wouter
- **Animations**: Framer Motion

## License

Copyright (c) 2025 Picture Perfect TV Install