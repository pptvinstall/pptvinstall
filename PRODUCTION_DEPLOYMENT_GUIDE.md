# Production Deployment Guide - pptvinstall.com

## DNS & SSL Setup

### 1. Domain Configuration
Point your domain to Replit's deployment infrastructure:

```
Domain: pptvinstall.com
Type: A Record
Value: [Replit deployment IP - available in deployment dashboard]

Subdomain: www.pptvinstall.com
Type: CNAME
Value: pptvinstall.com
```

### 2. SSL Certificate Setup
Replit automatically provisions SSL certificates for custom domains. Verify HTTPS is active:

```bash
curl -I https://pptvinstall.com/api/health
# Should return: HTTP/2 200 with valid SSL
```

### 3. Environment Variables for Production

Add these to your Replit deployment secrets:

```bash
# Production Environment
NODE_ENV=production
DOMAIN=pptvinstall.com

# Launch Mode (Keep Active)
LAUNCH_MODE=true
ENABLE_ALERTS=true
REAL_TIME_MONITORING=true

# Email Notifications
SENDGRID_API_KEY=[Your SendGrid API Key]
EMAIL_FROM=noreply@pptvinstall.com
ADMIN_EMAIL=your-email@domain.com

# Security
ADMIN_PASSWORD=[Generate secure 16+ character password]

# Optional: SMS Integration
TWILIO_ACCOUNT_SID=[Your Twilio SID]
TWILIO_AUTH_TOKEN=[Your Twilio Token]
TWILIO_PHONE_NUMBER=[Your Twilio Number]
```

## Monitoring Configuration

### 1. UptimeRobot Setup
```
Monitor Name: Picture Perfect TV Install - Health Check
URL: https://pptvinstall.com/api/health
Check Interval: 5 minutes
Alert Contacts: your-email@domain.com, your-phone-number

Monitor Name: Picture Perfect TV Install - Detailed Health
URL: https://pptvinstall.com/api/health/detailed?password=YOUR_ADMIN_PASSWORD
Check Interval: 15 minutes
Alert Contacts: your-email@domain.com
```

### 2. Email Alert Configuration
Configure SendGrid webhook for delivery failures:
```
Webhook URL: https://pptvinstall.com/api/webhooks/sendgrid
Events: delivered, bounced, dropped, deferred
```

### 3. Memory & Performance Alerts
Launch Mode automatically monitors:
- Memory usage >90% (WARNING)
- Response time >2000ms (WARNING)
- System status "unhealthy" (CRITICAL)

## Marketing Setup Materials

### Google My Business Profile
```
Business Name: Picture Perfect TV Install
Category: Home Improvement Contractor
Subcategory: TV Installation Service

Description:
Professional TV mounting and smart home installation services in Metro Atlanta. Expert technicians provide secure, clean installations for all TV sizes and types. Same-day service available. Licensed, insured, and fully equipped for any installation challenge.

Services:
- TV Mounting & Installation
- Smart Home Device Setup
- Fireplace TV Installation
- Outdoor TV Installation
- Cable Management
- Sound Bar Installation

Service Areas: Atlanta, Decatur, Marietta, Alpharetta, Sandy Springs, Roswell, Dunwoody, Buckhead

Phone: [Your Business Phone]
Website: https://pptvinstall.com
Booking URL: https://pptvinstall.com/booking

Hours:
Monday-Friday: 8:00 AM - 8:00 PM
Saturday: 9:00 AM - 6:00 PM
Sunday: 10:00 AM - 5:00 PM
```

### Instagram/Threads Announcement Caption
```
🚀 EXCITING NEWS! Picture Perfect TV Install is now LIVE and booking installations across Metro Atlanta!

✨ What we offer:
🔧 Professional TV mounting (all sizes)
🏠 Smart home device installation
🔥 Fireplace TV installations
📱 Same-day service available

💡 Why choose us:
✅ Licensed & insured technicians
✅ Clean, secure installations
✅ Transparent pricing
✅ Customer satisfaction guarantee

📅 Ready to upgrade your space? Book online now!
👆 Link in bio: pptvinstall.com/booking

#TVInstallation #Atlanta #SmartHome #HomeImprovement #TVMounting #AtlantaServices #BookNow
```

### Meta Pixel & Google Analytics Verification

Test these events are firing correctly:

**Meta Pixel Events:**
```bash
# Test ViewContent event
curl https://pptvinstall.com/
# Check: Meta Pixel fires on page load

# Test Lead event  
curl -X POST https://pptvinstall.com/api/booking [with test data]
# Check: Lead event fires on booking submission
```

**Google Analytics:**
```bash
# Verify GA4 tracking
Check pageview events in GA4 Real-Time reports
Verify goal conversions are tracking booking completions
```

## Soft Launch Strategy

### Phase 1: Friends & Family (Week 1)
- Share booking link with 10-15 close contacts
- Request honest feedback on booking experience
- Monitor system performance with real usage
- Target: 5-10 test bookings

### Phase 2: Social Media Announcement (Week 2)
- Instagram/Threads announcement post
- Facebook business page launch
- Next door neighborhood posts
- Target: 20-30 inquiries, 5-10 bookings

### Phase 3: Local Marketing (Week 3-4)
- Google My Business optimization
- Local directory listings
- Community group networking
- Target: Organic discovery, 10-15 bookings/week

## Success Metrics to Track

### Technical Metrics
- Uptime: Target >99.5%
- Response time: Target <1.5 seconds
- Conversion rate: Current 13.9% (maintain >10%)
- Email delivery: Target >95%

### Business Metrics
- Bookings per week
- Average order value
- Customer acquisition cost
- Repeat customer rate
- Geographic coverage

## Emergency Response Plan

### System Down
1. Check UptimeRobot alerts
2. Verify health endpoints
3. Restart Replit deployment if needed
4. Contact customers if prolonged outage

### High Volume Spike
1. Monitor Launch Mode alerts
2. Scale Replit resources if needed
3. Enable rate limiting if necessary
4. Celebrate the success!

### Email Issues
1. Check SendGrid dashboard
2. Verify API key is active
3. Test delivery to admin email
4. Switch to backup email service if needed

## Go-Live Deployment Steps

1. **Domain Setup**: Point DNS to Replit deployment
2. **SSL Verification**: Confirm HTTPS certificate active
3. **Environment Update**: Add production environment variables
4. **Monitoring Setup**: Configure UptimeRobot and alerts
5. **Final Testing**: Complete booking flow test on production domain
6. **Launch Announcement**: Post to social media and notify network

Production deployment typically takes 30-60 minutes for DNS propagation. Launch Mode monitoring ensures immediate detection of any issues.