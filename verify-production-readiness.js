#!/usr/bin/env node

/**
 * Production Readiness Verification Script
 * Tests all critical systems before domain deployment
 */

import fetch from 'node-fetch';
import { createWriteStream } from 'fs';
import { join } from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '9663';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, data };
  
  results.tests.push(logEntry);
  
  const prefix = {
    'INFO': '✅',
    'WARN': '⚠️',
    'ERROR': '❌',
    'SUCCESS': '🎉'
  }[level] || '📝';
  
  console.log(`${prefix} ${message}`);
  if (data) {
    console.log(`   ${JSON.stringify(data, null, 2)}`);
  }
}

async function testHealthEndpoints() {
  log('INFO', 'Testing health monitoring endpoints...');
  
  try {
    // Basic health check
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok && healthData.status) {
      log('SUCCESS', `Health endpoint responding: ${healthData.status}`, {
        uptime: healthData.uptime,
        memory: healthData.memory?.percentage,
        responseTime: healthData.responseTime,
        activeBookings: healthData.activeBookings
      });
      results.passed++;
    } else {
      log('ERROR', 'Health endpoint failed');
      results.failed++;
      return false;
    }
    
    // Detailed health check
    const detailedResponse = await fetch(`${API_BASE}/api/health/detailed?password=${ADMIN_PASSWORD}`);
    const detailedData = await detailedResponse.json();
    
    if (detailedResponse.ok && detailedData.success) {
      log('SUCCESS', 'Detailed health endpoint working', {
        launchMode: detailedData.launchConfig?.isLaunchMode,
        environment: detailedData.environment,
        version: detailedData.version
      });
      results.passed++;
    } else {
      log('ERROR', 'Detailed health endpoint failed');
      results.failed++;
    }
    
    return true;
  } catch (error) {
    log('ERROR', 'Health endpoints test failed', { error: error.message });
    results.failed++;
    return false;
  }
}

async function testBookingFlow() {
  log('INFO', 'Testing complete booking flow...');
  
  try {
    // Test live booking
    const liveBooking = {
      name: "Production Test User",
      email: "production-test@example.com",
      phone: "404-555-PROD",
      streetAddress: "123 Production Lane",
      city: "Atlanta",
      state: "GA",
      zipCode: "30309",
      serviceType: "TV Mounting",
      preferredDate: "2025-06-20",
      appointmentTime: "2:00 PM",
      notes: "Production readiness test booking",
      pricingTotal: "199.99",
      pricingBreakdown: [{"type": "tv", "size": "standard", "location": "standard", "mountType": "fixed"}],
      isTestMode: false
    };
    
    const bookingResponse = await fetch(`${API_BASE}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(liveBooking)
    });
    
    const bookingData = await bookingResponse.json();
    
    if (bookingResponse.ok && bookingData.success) {
      log('SUCCESS', 'Live booking flow operational', {
        bookingId: bookingData.booking?.id,
        emailsSent: 'Customer + Admin confirmations'
      });
      results.passed++;
    } else {
      log('ERROR', 'Live booking flow failed', bookingData);
      results.failed++;
    }
    
    // Test test mode booking
    const testBooking = { ...liveBooking, isTestMode: true, email: "test-mode@example.com" };
    const testResponse = await fetch(`${API_BASE}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBooking)
    });
    
    const testData = await testResponse.json();
    
    if (testResponse.ok && testData.success) {
      log('SUCCESS', 'Test mode booking operational');
      results.passed++;
    } else {
      log('ERROR', 'Test mode booking failed');
      results.failed++;
    }
    
    return true;
  } catch (error) {
    log('ERROR', 'Booking flow test failed', { error: error.message });
    results.failed++;
    return false;
  }
}

async function testEmailSystem() {
  log('INFO', 'Testing email delivery system...');
  
  try {
    const emailTest = await fetch(`${API_BASE}/api/email/test-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "production-verify@example.com",
        emailType: "booking_confirmation"
      })
    });
    
    const emailData = await emailTest.json();
    
    if (emailTest.ok && emailData.result) {
      log('SUCCESS', 'Email system operational');
      results.passed++;
    } else {
      log('ERROR', 'Email system failed', emailData);
      results.failed++;
    }
    
    return true;
  } catch (error) {
    log('ERROR', 'Email system test failed', { error: error.message });
    results.failed++;
    return false;
  }
}

async function testAdminDashboard() {
  log('INFO', 'Testing admin dashboard access...');
  
  try {
    // Test booking list access
    const bookingsResponse = await fetch(`${API_BASE}/api/bookings?password=${ADMIN_PASSWORD}`);
    const bookingsData = await bookingsResponse.json();
    
    if (bookingsResponse.ok && Array.isArray(bookingsData.bookings)) {
      log('SUCCESS', 'Admin dashboard accessible', {
        totalBookings: bookingsData.bookings.length,
        activeBookings: bookingsData.bookings.filter(b => b.status === 'active').length
      });
      results.passed++;
    } else {
      log('ERROR', 'Admin dashboard access failed');
      results.failed++;
    }
    
    // Test analytics access
    const analyticsResponse = await fetch(`${API_BASE}/api/admin/analytics?password=${ADMIN_PASSWORD}`);
    const analyticsData = await analyticsResponse.json();
    
    if (analyticsResponse.ok && analyticsData.totalViews !== undefined) {
      log('SUCCESS', 'Analytics system operational', {
        totalViews: analyticsData.totalViews,
        totalLeads: analyticsData.totalLeads,
        conversionRate: `${(analyticsData.conversionRate * 100).toFixed(2)}%`
      });
      results.passed++;
    } else {
      log('ERROR', 'Analytics system failed');
      results.failed++;
    }
    
    return true;
  } catch (error) {
    log('ERROR', 'Admin dashboard test failed', { error: error.message });
    results.failed++;
    return false;
  }
}

async function testDatabaseConnectivity() {
  log('INFO', 'Testing database connectivity and performance...');
  
  try {
    const start = Date.now();
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthResponse.json();
    const responseTime = Date.now() - start;
    
    if (healthData.database === true) {
      log('SUCCESS', 'Database connectivity confirmed', {
        responseTime: `${responseTime}ms`,
        status: 'Connected and responsive'
      });
      results.passed++;
    } else {
      log('ERROR', 'Database connectivity failed');
      results.failed++;
    }
    
    return true;
  } catch (error) {
    log('ERROR', 'Database connectivity test failed', { error: error.message });
    results.failed++;
    return false;
  }
}

async function testLaunchModeFeatures() {
  log('INFO', 'Testing Launch Mode monitoring features...');
  
  try {
    const launchResponse = await fetch(`${API_BASE}/api/admin/launch-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD, enable: false })
    });
    
    const launchData = await launchResponse.json();
    
    if (launchResponse.ok && launchData.success) {
      log('SUCCESS', 'Launch Mode controls operational', {
        isLaunchMode: launchData.launchConfig?.isLaunchMode,
        alertsEnabled: launchData.launchConfig?.alertsEnabled,
        monitoring: launchData.launchConfig?.realTimeMonitoring
      });
      results.passed++;
      
      // Re-enable launch mode
      await fetch(`${API_BASE}/api/admin/launch-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: ADMIN_PASSWORD, enable: true })
      });
      
    } else {
      log('ERROR', 'Launch Mode controls failed');
      results.failed++;
    }
    
    return true;
  } catch (error) {
    log('ERROR', 'Launch Mode test failed', { error: error.message });
    results.failed++;
    return false;
  }
}

async function testPerformanceMetrics() {
  log('INFO', 'Testing performance and response times...');
  
  const endpoints = [
    '/api/health',
    '/api/business-hours',
    '/'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await fetch(`${API_BASE}${endpoint}`);
      const responseTime = Date.now() - start;
      
      if (response.ok && responseTime < 2000) {
        log('SUCCESS', `${endpoint} performance acceptable`, {
          responseTime: `${responseTime}ms`,
          status: response.status
        });
        results.passed++;
      } else if (responseTime >= 2000) {
        log('WARN', `${endpoint} slow response`, {
          responseTime: `${responseTime}ms`,
          threshold: '2000ms'
        });
        results.warnings++;
      } else {
        log('ERROR', `${endpoint} failed performance test`);
        results.failed++;
      }
    } catch (error) {
      log('ERROR', `Performance test failed for ${endpoint}`, { error: error.message });
      results.failed++;
    }
  }
  
  return true;
}

async function generateProductionReport() {
  log('INFO', 'Generating production readiness report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.passed + results.failed + results.warnings,
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      successRate: `${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`
    },
    recommendation: results.failed === 0 ? 'READY FOR PRODUCTION' : 'REQUIRES ATTENTION',
    details: results.tests,
    nextSteps: results.failed === 0 ? [
      'Deploy to production domain',
      'Configure external monitoring',
      'Enable Launch Mode',
      'Begin soft launch testing'
    ] : [
      'Review and fix failed tests',
      'Re-run verification script',
      'Contact technical support if needed'
    ]
  };
  
  // Write report to file
  const reportPath = join(process.cwd(), 'production-readiness-report.json');
  const writeStream = createWriteStream(reportPath);
  writeStream.write(JSON.stringify(report, null, 2));
  writeStream.end();
  
  log('SUCCESS', `Production report generated: ${reportPath}`);
  
  return report;
}

async function runAllTests() {
  console.log('\n🚀 PRODUCTION READINESS VERIFICATION - Picture Perfect TV Install\n');
  console.log('Testing all critical systems before domain deployment...\n');
  
  const tests = [
    { name: 'Health Monitoring', fn: testHealthEndpoints },
    { name: 'Database Connectivity', fn: testDatabaseConnectivity },
    { name: 'Booking Flow', fn: testBookingFlow },
    { name: 'Email System', fn: testEmailSystem },
    { name: 'Admin Dashboard', fn: testAdminDashboard },
    { name: 'Launch Mode Features', fn: testLaunchModeFeatures },
    { name: 'Performance Metrics', fn: testPerformanceMetrics }
  ];
  
  for (const test of tests) {
    console.log(`\n--- Testing ${test.name} ---`);
    await test.fn();
  }
  
  console.log('\n--- Generating Final Report ---');
  const report = await generateProductionReport();
  
  console.log('\n='.repeat(60));
  console.log('PRODUCTION READINESS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Success Rate: ${report.summary.successRate}`);
  console.log(`\nRECOMMENDATION: ${report.recommendation}`);
  
  if (report.recommendation === 'READY FOR PRODUCTION') {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL - Ready for domain deployment!');
    console.log('\nNext steps:');
    report.nextSteps.forEach(step => console.log(`  • ${step}`));
  } else {
    console.log('\n⚠️  Some systems require attention before production deployment.');
    console.log('\nRequired actions:');
    report.nextSteps.forEach(step => console.log(`  • ${step}`));
  }
  
  console.log('\n='.repeat(60));
  
  process.exit(report.recommendation === 'READY FOR PRODUCTION' ? 0 : 1);
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });
}

export { runAllTests, testHealthEndpoints, testBookingFlow, testEmailSystem };