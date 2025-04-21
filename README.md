
# Newslettr - Podcast-Style Newsletter App

A modern web application that transforms newsletters into an audio experience, allowing users to listen to their favorite newsletters in podcast format.

## Features

- 🎧 Audio playback of newsletters
- 📱 Responsive design
- 🌙 Dark/Light theme support
- 📂 Category-based organization
- 🔐 User authentication (Local, Google, Facebook, Twitter)
- ⭐ Save favorite newsletters
- 📊 Quality settings for audio

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js
- **Audio**: Howler.js
- **Routing**: Wouter
- **State Management**: React Query
- **Forms**: React Hook Form, Zod

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database

### Development Setup

1. Clone the project in Replit
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - `DATABASE_URL`: PostgreSQL connection URL
   - `SESSION_SECRET`: Secret for session management
   - `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be running at:
- Frontend: http://0.0.0.0:5000
- API: http://0.0.0.0:5000/api

### Database Setup

1. Push database schema:
   ```bash
   npm run db:push
   ```

### Running Type Checks

```bash
npm run check
```

### Building for Production

```bash
npm run build
```

## Project Structure

- `/client` - Frontend React application
- `/server` - Express.js backend
- `/shared` - Shared TypeScript types and schemas
- `/public` - Static assets

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Update database schema

## Environment Variables

Required environment variables:
- `SESSION_SECRET` - Secret for session management
- `DATABASE_URL` - PostgreSQL database connection URL

## Contributing

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT
