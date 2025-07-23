import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Default system settings
const defaultSystemSettings = [
  { 
    name: 'bookingBufferHours', 
    value: JSON.stringify(2), 
    description: 'Number of hours before a booking time that it should be blocked' 
  }
];

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

    // Create the customers table if it doesn't exist
    await client.query(`
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
        member_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        verification_token VARCHAR(100),
        is_verified BOOLEAN DEFAULT FALSE,
        password_reset_token VARCHAR(100),
        password_reset_expires TIMESTAMP
      );
    `);

    console.log('Customers table created or confirmed.');

    // Create the system_settings table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(64) NOT NULL UNIQUE,
        value JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('System settings table created or confirmed.');

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

    // Check if we already have system settings data
    const existingSettingsResult = await client.query('SELECT COUNT(*) FROM system_settings');
    const settingsCount = parseInt(existingSettingsResult.rows[0].count, 10);

    if (settingsCount === 0) {
      console.log('Inserting default system settings...');
      
      // Insert default system settings
      for (const setting of defaultSystemSettings) {
        await client.query(
          'INSERT INTO system_settings (name, value, description) VALUES ($1, $2, $3)',
          [setting.name, setting.value, setting.description]
        );
      }

      console.log('Default system settings inserted successfully!');
    } else {
      console.log(`Found existing system settings data (${settingsCount} records), skipping insertion.`);
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