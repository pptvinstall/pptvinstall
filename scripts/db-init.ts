import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../shared/schema';
import { businessHours, customers, systemSettings } from '../shared/schema';

const { Pool } = pg;

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

// Default system settings
const defaultSystemSettings = [
  { 
    name: 'bookingBufferHours', 
    value: JSON.stringify(2), 
    description: 'Number of hours before a booking time that it should be blocked' 
  }
];

async function initializeDatabase() {
  try {
    // First, ensure tables exist by pushing schema (this is safe to run multiple times)
    console.log('Creating database tables if they don\'t exist...');
    
    // Check if customers table exists and create it if needed
    try {
      console.log('Setting up customers table...');
      // Create customers table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          phone VARCHAR(20) NOT NULL,
          password VARCHAR(255) NOT NULL,
          street_address VARCHAR(255),
          address_line2 VARCHAR(255),
          city VARCHAR(100),
          state VARCHAR(2),
          zip_code VARCHAR(5),
          loyalty_points INTEGER DEFAULT 0,
          member_since TIMESTAMP DEFAULT NOW(),
          last_login TIMESTAMP,
          verification_token VARCHAR(100),
          is_verified BOOLEAN DEFAULT FALSE,
          password_reset_token VARCHAR(100),
          password_reset_expires TIMESTAMP
        )
      `);
      
      console.log('Successfully set up customers table');
    } catch (err) {
      console.error('Error setting up customers table:', err);
    }
    
    // Check if system_settings table exists and create it if needed
    try {
      console.log('Setting up system_settings table...');
      // Create system_settings table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          name VARCHAR(64) NOT NULL UNIQUE,
          value JSONB NOT NULL,
          description TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('Successfully set up system_settings table');
      
      // Insert default system settings
      for (const setting of defaultSystemSettings) {
        const existingSettings = await pool.query('SELECT * FROM system_settings WHERE name = $1', [setting.name]);
        
        if (existingSettings.rows.length === 0) {
          console.log(`Creating system setting: ${setting.name}`);
          await pool.query(
            'INSERT INTO system_settings (name, value, description) VALUES ($1, $2, $3)',
            [setting.name, setting.value, setting.description]
          );
        } else {
          console.log(`System setting ${setting.name} already exists, skipping`);
        }
      }
    } catch (err) {
      console.error('Error setting up system_settings table:', err);
    }
    
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