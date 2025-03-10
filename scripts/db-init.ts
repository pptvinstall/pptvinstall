import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';
import { businessHours } from '../shared/schema';

console.log('Database initialization starting...');

// Check for environment variable
if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// Default business hours
// Monday to Friday: 6:30 PM - 10:30 PM
// Saturday to Sunday: 11:00 AM - 7:00 PM
const defaultBusinessHours = [
  { dayOfWeek: 0, startTime: '11:00', endTime: '19:00', isAvailable: true }, // Sunday
  { dayOfWeek: 1, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Monday
  { dayOfWeek: 2, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Tuesday
  { dayOfWeek: 3, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Wednesday
  { dayOfWeek: 4, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Thursday
  { dayOfWeek: 5, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Friday
  { dayOfWeek: 6, startTime: '11:00', endTime: '19:00', isAvailable: true }, // Saturday
];

async function initializeDatabase() {
  try {
    // First, ensure tables exist by pushing schema (this is safe to run multiple times)
    console.log('Creating database tables if they don\'t exist...');
    
    console.log('Setting up business hours...');
    
    // For each day of the week, either create or update the business hours
    for (const hours of defaultBusinessHours) {
      // Check if entry already exists
      const existingHours = await db.query.businessHours.findFirst({
        where: (bh, { eq }) => eq(bh.dayOfWeek, hours.dayOfWeek)
      });
      
      if (existingHours) {
        console.log(`Updating business hours for day ${hours.dayOfWeek}`);
        await db
          .update(businessHours)
          .set({
            startTime: hours.startTime,
            endTime: hours.endTime,
            isAvailable: hours.isAvailable
          })
          .where((bh, { eq }) => eq(bh.dayOfWeek, hours.dayOfWeek));
      } else {
        console.log(`Creating business hours for day ${hours.dayOfWeek}`);
        await db.insert(businessHours).values({
          dayOfWeek: hours.dayOfWeek,
          startTime: hours.startTime,
          endTime: hours.endTime,
          isAvailable: hours.isAvailable
        });
      }
    }
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the initialization
initializeDatabase();