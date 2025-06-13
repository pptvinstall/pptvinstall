#!/usr/bin/env node

const axios = require('axios');

async function testGmailEmailSystem() {
  console.log('🧪 Testing Gmail Email System...\n');
  
  const testBooking = {
    name: "Email System Test",
    email: "jwoodceo@gmail.com",
    phone: "404-555-9999",
    streetAddress: "123 Gmail Test Boulevard",
    city: "Atlanta", 
    state: "GA",
    zipCode: "30309",
    serviceType: "TV Installation",
    preferredDate: "2025-06-20",
    appointmentTime: "2:30 PM",
    notes: "Final verification of Gmail SMTP system with personalized subject lines and unified templates",
    pricingTotal: 200,
    pricingBreakdown: [
      {
        type: "tv", 
        size: "large", 
        location: "over_fireplace", 
        mountType: "full_motion", 
        masonryWall: true,
        outletRelocation: true
      }
    ],
    consentToContact: true,
    createAccount: false
  };

  try {
    console.log('📧 Submitting test booking...');
    const response = await axios.post('http://localhost:5000/api/booking', testBooking, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.success) {
      console.log('✅ Booking created successfully!');
      console.log(`📋 Booking ID: ${response.data.booking.id}`);
      console.log(`📅 Date: ${response.data.booking.preferredDate}`);
      console.log(`⏰ Time: ${response.data.booking.appointmentTime}`);
      console.log(`💰 Total: $${response.data.booking.pricingTotal}`);
      
      console.log('\n📨 Expected Email Details:');
      console.log(`   From: Picture Perfect TV <pptvinstall@gmail.com>`);
      console.log(`   To: ${testBooking.email} (Customer)`);
      console.log(`   CC: pptvinstall@gmail.com (Admin)`);
      console.log(`   Subject: "Your Booking is Confirmed – Jun 20 @ 2:30 PM"`);
      console.log(`   Content: Professional HTML template with calendar attachment`);
      
      console.log('\n🎯 Check your inbox for:');
      console.log('   • Instant delivery (no delays)');
      console.log('   • Clean, professional formatting');
      console.log('   • Blue info banner with emoji');
      console.log('   • Complete service breakdown');
      console.log('   • Calendar .ics attachment');
      console.log('   • Spam-prevention footer');
      
    } else {
      console.log('❌ Booking failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

testGmailEmailSystem();