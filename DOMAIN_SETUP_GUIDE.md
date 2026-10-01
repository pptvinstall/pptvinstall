# Domain Setup Guide - pptvinstall.com

## Domain Basics

- Primary domain: `pptvinstall.com`
- Canonical URL: `https://pptvinstall.com`
- Booking page: `https://pptvinstall.com/booking`
- Health endpoints:
  - `https://pptvinstall.com/api/health`
  - `https://pptvinstall.com/api/ready`

## Production Environment Variables

```bash
DOMAIN=pptvinstall.com
NODE_ENV=production
DATABASE_URL=postgresql://...

EMAIL_USER=pptvinstall@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM="Picture Perfect TV Install <pptvinstall@gmail.com>"
ADMIN_EMAIL=pptvinstall@gmail.com
```

## Verification Checklist

```bash
curl -I https://pptvinstall.com/api/health
curl -I https://pptvinstall.com/api/ready
curl -I https://pptvinstall.com/
```

## Email Delivery

Email delivery is handled by Gmail SMTP from `server/email.ts`.
No SendGrid webhook is used in the current production setup.

## SEO & Analytics Setup

### Google Search Console
1. Add property: https://pptvinstall.com
2. Verify ownership via HTML file or DNS
3. Submit sitemap: https://pptvinstall.com/sitemap.xml
4. Monitor indexing status

### Google Analytics 4
```html
<!-- Add to website head section -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Meta Pixel Verification
```javascript
// Verify events are firing on production domain
fbq('track', 'ViewContent', {
  content_name: 'Home Page',
  content_category: 'page_view'
});
```

## Monitoring Setup for Production

### UptimeRobot Configuration
```
Monitor 1: Health Check
URL: https://pptvinstall.com/api/health
Interval: 5 minutes
Alert Methods: Email, SMS
Keyword Monitoring: "healthy"

Monitor 2: Main Website
URL: https://pptvinstall.com/
Interval: 5 minutes  
Alert Methods: Email
HTTP Status: 200

Monitor 3: Admin Health Check
URL: https://pptvinstall.com/api/health/detailed?password=YOUR_ADMIN_PASSWORD
Interval: 15 minutes
Alert Methods: Email
```

### Email Alert Configuration
SendGrid webhook for delivery monitoring:
```
Webhook URL: https://pptvinstall.com/api/webhooks/sendgrid
Events: delivered, bounced, dropped, deferred
HTTP Method: POST
```

### Custom Domain Alerts
Monitor these specific scenarios:
- SSL certificate expiration
- DNS resolution failures  
- Domain renewal reminders
- CDN performance issues

## Launch Day Performance Checklist

### Pre-Launch (30 minutes before)
- [ ] DNS propagation confirmed
- [ ] SSL certificate active
- [ ] All endpoints responding correctly
- [ ] Email delivery tested
- [ ] Admin dashboard accessible
- [ ] Analytics tracking verified

### Launch Hour (Monitor every 15 minutes)
- [ ] Response times <2 seconds
- [ ] No 4xx/5xx errors
- [ ] Email delivery >95%
- [ ] Memory usage <90%
- [ ] Database connections stable

### Post-Launch (First 24 hours)
- [ ] Booking submissions processing correctly
- [ ] Customer emails delivering successfully
- [ ] Admin notifications working
- [ ] Search engine crawling detected
- [ ] Social media traffic routing properly

## Troubleshooting Common Issues

### DNS Not Propagating
```bash
# Check DNS propagation globally
dig @8.8.8.8 pptvinstall.com
nslookup pptvinstall.com 1.1.1.1

# Force refresh local DNS
sudo dnsmasq-base restart  # Linux
ipconfig /flushdns         # Windows
sudo dscacheutil -flushcache  # macOS
```

### SSL Certificate Issues
```bash
# Check certificate details
openssl s_client -connect pptvinstall.com:443 -servername pptvinstall.com

# Verify certificate chain
curl -vI https://pptvinstall.com 2>&1 | grep -E "(SSL|TLS|certificate)"
```

### Performance Issues
```bash
# Check server response
curl -w "%{time_total}" -o /dev/null -s https://pptvinstall.com/

# Monitor memory usage
curl https://pptvinstall.com/api/health/detailed?password=YOUR_ADMIN_PASSWORD
```

## Success Metrics

### Technical KPIs
- Uptime: >99.5%
- Response Time: <2 seconds average
- SSL Score: A+ rating
- Page Speed: >90 on PageSpeed Insights

### Business KPIs  
- Organic traffic growth: >20% month-over-month
- Booking conversion rate: >10%
- Email delivery rate: >95%
- Customer satisfaction: >4.5/5 stars

## Next Steps After Domain Live

1. **Submit to Search Engines**
   - Google Search Console
   - Bing Webmaster Tools
   - Local directory submissions

2. **Social Media Updates**
   - Update all profile links to pptvinstall.com
   - Launch social media campaign
   - Begin content marketing

3. **Business Listings**
   - Google My Business optimization
   - Yelp business profile
   - Local chamber of commerce

4. **Performance Optimization**
   - Monitor and optimize based on real traffic
   - A/B test booking flow improvements
   - Expand service areas based on demand

Domain setup complete. System ready for production traffic.
