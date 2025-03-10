import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeDatabase() {
  console.log('Starting database initialization...');
  const client = await pool.connect();

  try {
    // Create the business_hours table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_hours (
        id SERIAL PRIMARY KEY,
        day_of_week INTEGER NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Business hours table created or confirmed.');

    // Check if we already have business hours data
    const existingDataResult = await client.query('SELECT COUNT(*) FROM business_hours');
    const count = parseInt(existingDataResult.rows[0].count, 10);

    if (count === 0) {
      console.log('Inserting default business hours...');
      
      // Default business hours configuration
      // Monday-Friday: 6:30 PM - 10:30 PM
      // Saturday-Sunday: 11:00 AM - 7:00 PM
      const defaultBusinessHours = [
        { dayOfWeek: 0, startTime: '11:00', endTime: '19:00', isAvailable: true }, // Sunday
        { dayOfWeek: 1, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Monday
        { dayOfWeek: 2, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Tuesday
        { dayOfWeek: 3, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Wednesday
        { dayOfWeek: 4, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Thursday
        { dayOfWeek: 5, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Friday
        { dayOfWeek: 6, startTime: '11:00', endTime: '19:00', isAvailable: true }, // Saturday
      ];

      // Insert data for each day of the week
      for (const hours of defaultBusinessHours) {
        await client.query(
          'INSERT INTO business_hours (day_of_week, start_time, end_time, is_available) VALUES ($1, $2, $3, $4)',
          [hours.dayOfWeek, hours.startTime, hours.endTime, hours.isAvailable]
        );
      }

      console.log('Default business hours inserted successfully!');
    } else {
      console.log(`Found existing business hours data (${count} records), skipping insertion.`);
    }

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error during database initialization:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the initialization
initializeDatabase();