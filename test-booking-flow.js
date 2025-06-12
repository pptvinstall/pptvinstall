// Test the complete booking flow
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

// Test booking data
const testBooking = {
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: '(555) 123-4567',
  streetAddress: '123 Test Street',
  city: 'Atlanta',
  state: 'GA',
  zipCode: '30309',
  preferredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
  appointmentTime: '10:00 AM',
  serviceType: 'TV Installation',
  pricingTotal: 149.99,
  notes: 'This is a test booking to verify the complete flow',
  consentToContact: true,
  tvInstallations: [
    {
      id: 'tv-1',
      size: '55"',
      location: 'Living Room',
      mountType: 'fixed',
      masonryWall: false,
      highRise: false,
      outletNeeded: true
    }
  ],
  smartHomeInstallations: [],
  isTestMode: true // Enable test mode
};

console.log('🧪 Testing booking flow...\n');

// Test 1: Health check
async function testHealthCheck() {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    console.log('✅ Health check:', data.status);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

// Test 2: Create booking
async function testCreateBooking() {
  try {
    const response = await fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBooking)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Booking created successfully');
      console.log(`   Booking ID: ${data.booking.id}`);
      console.log(`   Customer: ${data.booking.name}`);
      console.log(`   Test Mode: ${testBooking.isTestMode ? 'YES' : 'NO'}`);
      return data.booking;
    } else {
      console.log('❌ Booking creation failed:', data.error || data.message);
      if (data.validationErrors) {
        console.log('   Validation errors:', data.validationErrors);
      }
      return null;
    }
  } catch (error) {
    console.log('❌ Booking creation error:', error.message);
    return null;
  }
}

// Test 3: Fetch bookings
async function testFetchBookings() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/bookings`, {
      headers: {
        'Cookie': 'admin-session=test' // Mock admin session
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Bookings fetched successfully');
      console.log(`   Total bookings: ${data.bookings?.length || 0}`);
      
      // Look for our test booking
      const testBookings = data.bookings?.filter(b => b.name.includes('[TEST]')) || [];
      console.log(`   Test bookings: ${testBookings.length}`);
      
      return data.bookings;
    } else {
      console.log('❌ Failed to fetch bookings:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Fetch bookings error:', error.message);
    return null;
  }
}

// Test 4: Email configuration
async function testEmailConfig() {
  try {
    const response = await fetch(`${API_BASE}/api/email/check-config`);
    const data = await response.json();
    
    if (data.sendgridConfigured) {
      console.log('✅ SendGrid configuration: OK');
      console.log(`   From email: ${data.fromEmail}`);
      console.log(`   Admin email: ${data.adminEmail}`);
    } else {
      console.log('⚠️  SendGrid not configured');
    }
    
    return data.sendgridConfigured;
  } catch (error) {
    console.log('❌ Email config check failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting booking flow tests...\n');
  
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Server health check failed. Aborting tests.');
    return;
  }
  
  const emailConfigOk = await testEmailConfig();
  
  const booking = await testCreateBooking();
  if (booking) {
    console.log('\n📋 Booking Details:');
    console.log(`   ID: ${booking.id}`);
    console.log(`   Name: ${booking.name}`);
    console.log(`   Email: ${booking.email}`);
    console.log(`   Date: ${booking.preferredDate}`);
    console.log(`   Time: ${booking.appointmentTime}`);
    console.log(`   Total: $${booking.pricingTotal}`);
  }
  
  const bookings = await testFetchBookings();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Server health: ${healthOk ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Email config: ${emailConfigOk ? 'PASS' : 'WARN'}`);
  console.log(`✅ Create booking: ${booking ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Fetch bookings: ${bookings ? 'PASS' : 'FAIL'}`);
  
  if (booking && emailConfigOk) {
    console.log('\n📧 Email notifications should have been sent:');
    console.log('   • Admin notification (always sent, even in test mode)');
    console.log('   • Customer confirmation (skipped in test mode)');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Check your email for admin notifications');
  console.log('   2. Visit /admin/bookings to see the booking');
  console.log('   3. Try booking from the web interface');
  console.log('   4. Test calendar export (.ics download)');
}

// Execute tests
runTests().catch(console.error);