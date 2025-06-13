# Email Deliverability Setup Guide
## DNS Configuration for pptvinstall.com

### Overview
To ensure your booking confirmation emails reach customers' inboxes instead of spam folders, you need to configure these DNS records for your domain.

### 1. SPF Record (Sender Policy Framework)
Add this TXT record to your DNS:

**Record Type:** TXT  
**Name:** @ (or pptvinstall.com)  
**Value:** `v=spf1 include:sendgrid.net ~all`

This tells email providers that SendGrid is authorized to send emails on behalf of your domain.

### 2. DKIM Records (DomainKeys Identified Mail)
You'll need to get these from your SendGrid account:

1. Log into SendGrid
2. Go to Settings > Sender Authentication
3. Click "Authenticate Your Domain"
4. Enter: pptvinstall.com
5. SendGrid will provide 3 CNAME records to add to your DNS

**Example CNAME records (yours will be different):**
- `s1._domainkey.pptvinstall.com` → `s1.domainkey.u1234567.wl123.sendgrid.net`
- `s2._domainkey.pptvinstall.com` → `s2.domainkey.u1234567.wl123.sendgrid.net`

### 3. DMARC Record
Add this TXT record:

**Record Type:** TXT  
**Name:** _dmarc  
**Value:** `v=DMARC1; p=quarantine; rua=mailto:pptvinstall@gmail.com; ruf=mailto:pptvinstall@gmail.com; sp=quarantine; adkim=r; aspf=r`

### 4. Domain Verification in SendGrid
After adding the DNS records:
1. Return to SendGrid Sender Authentication
2. Click "Verify" for your domain
3. All checks should pass (green checkmarks)

### 5. Update Environment Variables
Once domain is verified, update your .env file:

```
EMAIL_FROM=Picture Perfect TV Install <noreply@pptvinstall.com>
ADMIN_EMAIL=pptvinstall@gmail.com
```

### DNS Provider Instructions

#### For GoDaddy:
1. Log into GoDaddy account
2. Go to DNS Management for pptvinstall.com
3. Add the TXT and CNAME records above

#### For Cloudflare:
1. Log into Cloudflare dashboard
2. Select pptvinstall.com domain
3. Go to DNS tab
4. Add the records with Proxy Status = DNS only (gray cloud)

#### For Namecheap:
1. Log into Namecheap account
2. Go to Domain List > Manage
3. Advanced DNS tab
4. Add the records

### Verification Steps
After adding DNS records:

1. **Check SPF:** Use online SPF checker with pptvinstall.com
2. **Check DKIM:** SendGrid dashboard will show verification status
3. **Check DMARC:** Use DMARC checker tools
4. **Test Email:** Send test booking to verify inbox delivery

### Expected Results
- Customer emails land in inbox instead of spam
- Professional "from" address: noreply@pptvinstall.com
- Improved email reputation and deliverability
- Enhanced trust with email providers

### Troubleshooting
- DNS changes can take up to 48 hours to propagate
- Use tools like mxtoolbox.com to verify records
- SendGrid support can help with domain authentication issues

### Current Status
✅ Enhanced email templates with professional formatting  
✅ Personalized subject lines for better engagement  
✅ Plain-text versions for maximum compatibility  
✅ Spam prevention disclaimers added  
⏳ DNS configuration pending (requires domain access)

Once DNS is configured, your email deliverability will be optimized for professional business communications.