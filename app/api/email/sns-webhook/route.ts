// app/api/email/sns-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import MessageValidator from 'sns-validator';
import { processBounce } from '@/lib/messaging/bounce-processor';
import { processComplaint } from '@/lib/messaging/complaint-processor';

// Initialize SNS message validator
const validator = new MessageValidator();

// In-memory idempotency tracking (for duplicate message prevention)
const processedMessages = new Set<string>();
const MAX_PROCESSED_MESSAGES = 1000;

// Simple rate limiter for webhook endpoint
class WebhookRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 1000, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  checkLimit(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    // Cleanup old keys periodically
    if (this.requests.size > 1000) {
      const keysToDelete: string[] = [];
      this.requests.forEach((times, key) => {
        if (times.every(time => now - time > this.windowMs)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.requests.delete(key));
    }
    
    return true;
  }
}

const webhookLimiter = new WebhookRateLimiter(1000, 60000); // 1000 requests per minute

/**
 * SNS Webhook Endpoint
 * Receives bounce and complaint notifications from AWS SNS
 * 
 * Security:
 * 1. SNS signature verification (cryptographic authentication)
 * 2. Topic ARN validation
 * 3. Rate limiting (after signature verification)
 * 4. Idempotency tracking
 * 5. HTTPS only in production
 */
export async function POST(request: NextRequest) {
  try {
    // HTTPS enforcement in production
    if (process.env.NODE_ENV === 'production') {
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      if (protocol !== 'https') {
        console.error('HTTPS required in production');
        return NextResponse.json({ error: 'HTTPS required' }, { status: 403 });
      }
    }

    // Parse request body
    const body = await request.text();
    let message: any;
    
    try {
      message = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON in SNS message:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // STEP 1: Verify SNS signature (primary defense)
    try {
      await validator.validate(message);
    } catch (error) {
      console.error('Invalid SNS signature:', error);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // STEP 2: Validate Topic ARN (ensure it's from our SNS topic)
    const expectedTopicArn = process.env.AWS_SNS_TOPIC_ARN;
    if (expectedTopicArn && message.TopicArn !== expectedTopicArn) {
      console.error('Invalid topic ARN:', message.TopicArn);
      return NextResponse.json({ error: 'Invalid topic' }, { status: 403 });
    }

    // STEP 3: Rate limiting (only for valid AWS messages)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    if (!webhookLimiter.checkLimit(`webhook:${clientIP}`)) {
      console.warn('Rate limit exceeded for valid SNS messages from:', clientIP);
      // Return 503 (Service Unavailable) to trigger SNS retry
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }

    // STEP 4: Handle SNS subscription confirmation
    if (message.Type === 'SubscriptionConfirmation') {
      console.log('Confirming SNS subscription...');
      await confirmSNSSubscription(message.SubscribeURL);
      return NextResponse.json({ message: 'Subscription confirmed' });
    }

    // STEP 5: Handle SNS notifications
    if (message.Type === 'Notification') {
      // Check idempotency (prevent duplicate processing)
      if (processedMessages.has(message.MessageId)) {
        console.log('Duplicate message, skipping:', message.MessageId);
        return NextResponse.json({ message: 'Already processed' });
      }

      // Parse notification message
      let notification: any;
      try {
        notification = JSON.parse(message.Message);
      } catch (error) {
        console.error('Invalid notification JSON:', error);
        return NextResponse.json({ error: 'Invalid notification format' }, { status: 400 });
      }

      // Validate notification structure
      if (!notification.notificationType) {
        console.error('Missing notificationType in notification');
        return NextResponse.json({ error: 'Invalid notification structure' }, { status: 400 });
      }

      // Process based on notification type
      try {
        if (notification.notificationType === 'Bounce') {
          if (!notification.bounce || !notification.mail) {
            console.error('Missing bounce or mail data in notification');
            return NextResponse.json({ error: 'Invalid bounce notification' }, { status: 400 });
          }
          await processBounce(notification.bounce, notification.mail);
          console.log('Bounce notification processed successfully');
        } else if (notification.notificationType === 'Complaint') {
          if (!notification.complaint || !notification.mail) {
            console.error('Missing complaint or mail data in notification');
            return NextResponse.json({ error: 'Invalid complaint notification' }, { status: 400 });
          }
          await processComplaint(notification.complaint, notification.mail);
          console.log('Complaint notification processed successfully');
        } else {
          console.warn('Unknown notification type:', notification.notificationType);
          return NextResponse.json({ message: 'Unknown notification type' }, { status: 200 });
        }

        // Mark message as processed
        processedMessages.add(message.MessageId);

        // Clean up old message IDs (keep last 1000)
        if (processedMessages.size > MAX_PROCESSED_MESSAGES) {
          const toDelete = Array.from(processedMessages).slice(0, 100);
          toDelete.forEach(id => processedMessages.delete(id));
        }

        return NextResponse.json({ message: 'Processed' });
      } catch (error) {
        console.error('Error processing notification:', error);
        // Return 500 to trigger SNS retry
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
      }
    }

    // Unknown message type
    console.warn('Unknown SNS message type:', message.Type);
    return NextResponse.json({ message: 'Unknown message type' }, { status: 400 });

  } catch (error) {
    console.error('SNS webhook error:', error);
    // Return 500 to trigger SNS retry
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Confirm SNS subscription automatically
 * AWS sends a SubscriptionConfirmation message when you first subscribe
 */
async function confirmSNSSubscription(subscribeURL: string): Promise<void> {
  try {
    const response = await fetch(subscribeURL);
    if (!response.ok) {
      throw new Error(`Failed to confirm SNS subscription: ${response.status}`);
    }
    console.log('SNS subscription confirmed successfully');
  } catch (error) {
    console.error('Error confirming SNS subscription:', error);
    throw error;
  }
}
