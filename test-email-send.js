import https from 'https';

const data = JSON.stringify({
  email: "jwoodceo@gmail.com",
  emailType: "booking_confirmation"
});

const options = {
  hostname: 'd11f8565-cd09-4efd-be2c-0981b311e35a-00-1smf2f5e8thhk.worf.replit.dev',
  port: 443,
  path: '/api/email/test-send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', body);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();