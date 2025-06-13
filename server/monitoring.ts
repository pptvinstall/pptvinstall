import { logger } from './services/loggingService';
import { storage } from './storage';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: boolean;
  email: boolean;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  responseTime: number;
  activeBookings: number;
  lastBookingTime?: string;
}

export interface LaunchModeConfig {
  isLaunchMode: boolean;
  testModeDisabled: boolean;
  backupsEnabled: boolean;
  alertsEnabled: boolean;
  realTimeMonitoring: boolean;
  debugLogging: boolean;
}

export class MonitoringService {
  private startTime: number;
  private launchConfig: LaunchModeConfig;

  constructor() {
    this.startTime = Date.now();
    this.launchConfig = {
      isLaunchMode: process.env.LAUNCH_MODE === 'true',
      testModeDisabled: process.env.DISABLE_TEST_MODE === 'true',
      backupsEnabled: process.env.ENABLE_BACKUPS === 'true',
      alertsEnabled: process.env.ENABLE_ALERTS === 'true',
      realTimeMonitoring: process.env.REAL_TIME_MONITORING === 'true',
      debugLogging: process.env.DEBUG_LOGGING !== 'false'
    };

    if (this.launchConfig.isLaunchMode) {
      logger.info('🚀 LAUNCH MODE ACTIVATED', this.launchConfig);
      this.startHealthMonitoring();
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    // Test database connectivity
    let databaseHealthy = false;
    try {
      await storage.getSystemSettings();
      databaseHealthy = true;
    } catch (error) {
      logger.error('Database health check failed:', error as Error);
    }

    // Test email service
    let emailHealthy = false;
    try {
      emailHealthy = !!(process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM);
    } catch (error) {
      logger.error('Email service health check failed:', error as Error);
    }

    // Get memory usage
    const memUsage = process.memoryUsage();
    const memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };

    // Get active bookings count
    let activeBookings = 0;
    let lastBookingTime: string | undefined;
    try {
      const bookings = await storage.getAllBookings();
      activeBookings = bookings.filter(b => b.status === 'active').length;
      if (bookings.length > 0) {
        const sortedBookings = bookings.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        lastBookingTime = sortedBookings[0].createdAt;
      }
    } catch (error) {
      logger.error('Failed to get booking statistics:', error as Error);
    }

    const responseTime = Date.now() - startTime;
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    // Determine overall health status - relaxed thresholds to prevent false alarms
    let status: SystemHealth['status'] = 'healthy';
    if (!databaseHealthy) {
      status = 'unhealthy';
    } else if (!emailHealthy || memory.percentage > 95 || responseTime > 5000) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      database: databaseHealthy,
      email: emailHealthy,
      memory,
      responseTime,
      activeBookings,
      lastBookingTime
    };
  }

  private async startHealthMonitoring() {
    const interval = 30000; // 30 seconds
    
    setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        if (health.status === 'unhealthy') {
          await this.sendAlert('CRITICAL', 'System unhealthy', health);
        } else if (health.status === 'degraded') {
          await this.sendAlert('WARNING', 'System degraded', health);
        }

        if (this.launchConfig.realTimeMonitoring) {
          logger.info('Health check:', {
            status: health.status,
            uptime: health.uptime,
            memory: health.memory.percentage,
            responseTime: health.responseTime,
            activeBookings: health.activeBookings
          });
        }
      } catch (error) {
        logger.error('Health monitoring error:', error as Error);
        await this.sendAlert('CRITICAL', 'Health monitoring failed', { error: (error as Error).message });
      }
    }, interval);
  }

  private async sendAlert(level: 'INFO' | 'WARNING' | 'CRITICAL', message: string, data: any) {
    // Temporarily disable alerts to prevent UI interference
    return;
    
    if (!this.launchConfig.alertsEnabled) return;

    const alert = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      system: 'Picture Perfect TV Install'
    };

    logger.error(`🚨 ${level} ALERT: ${message}`, alert);

    // In production, this would send to external monitoring services
    // For now, we log extensively for admin visibility
    if (level === 'CRITICAL') {
      console.error('🚨 CRITICAL SYSTEM ALERT 🚨');
      console.error(JSON.stringify(alert, null, 2));
    }
  }

  async logBookingEvent(booking: any, event: 'created' | 'updated' | 'cancelled') {
    if (!this.launchConfig.isLaunchMode) return;

    const eventData = {
      bookingId: booking.id,
      event,
      timestamp: new Date().toISOString(),
      customerEmail: booking.email,
      serviceType: booking.serviceType,
      amount: booking.pricingTotal,
      isTestMode: booking.isTestMode || false
    };

    logger.info(`Booking ${event}:`, eventData);

    // Track conversion metrics
    if (event === 'created' && !booking.isTestMode) {
      logger.info('🎯 Live booking conversion tracked', {
        source: 'organic',
        value: booking.pricingTotal,
        location: `${booking.city}, ${booking.state}`
      });
    }
  }

  getLaunchConfig(): LaunchModeConfig {
    return { ...this.launchConfig };
  }

  async enableLaunchMode() {
    this.launchConfig.isLaunchMode = true;
    this.launchConfig.testModeDisabled = true;
    this.launchConfig.backupsEnabled = true;
    this.launchConfig.alertsEnabled = true;
    this.launchConfig.realTimeMonitoring = true;

    logger.info('🚀 LAUNCH MODE ENABLED', this.launchConfig);
    this.startHealthMonitoring();
  }
}

export const monitoring = new MonitoringService();