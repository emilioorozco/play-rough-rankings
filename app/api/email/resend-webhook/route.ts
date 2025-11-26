/**
 * Resend Webhook Endpoint
 * 
 * Receives bounce and complaint notifications from Resend via Svix webhooks.
 * 
 * Resend Event Types (via Svix):
 * - email.bounced - Email bounced (hard or soft)
 * - email.complained - Email marked as spam
 * - email.delivered - Email successfully delivered
 * - email.delivery_delayed - Temporary delivery delay
 * 
 * Security:
 * - Svix webhook signature verification (Resend uses Svix for webhooks)
 * - Signature in Svix-Signature header
 * - HTTPS only in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { processBounce } from '@/lib/messaging/bounce-processor';
import { processComplaint } from '@/lib/messaging/complaint-processor';

/**
 * Handle Resend bounce event
 * Transforms Resend format to generic format and calls existing processor
 * 
 * Note: Resend provides minimal bounce details compared to AWS SES.
 * We treat all bounces as hard bounces for safety unless we can determine otherwise.
 */
async function handleResendBounce(event: any) {
  const data = event.data;
  
  // Extract recipient email from 'to' array
  const recipientEmail = Array.isArray(data.to) ? data.to[0] : data.to;
  
  // Transform Resend bounce format to generic format
  // Note: Resend doesn't provide bounce_type or diagnostic_code in the webhook
  // We default to 'Permanent' (hard bounce) for safety
  const bounce = {
    bounceType: 'Permanent', // Resend doesn't distinguish - default to hard bounce
    bounceSubType: 'General',
    bouncedRecipients: [{
      emailAddress: recipientEmail,
      diagnosticCode: undefined, // Not provided by Resend
    }],
    timestamp: event.created_at,
    feedbackId: data.email_id, // Use email_id as feedback ID
  };
  
  const mail = {
    messageId: data.email_id,
  };
  
  console.log('Processing Resend bounce:', {
    recipient: recipientEmail,
    emailId: data.email_id,
    timestamp: event.created_at,
  });
  
  // Use existing bounce processor (no changes needed!)
  await processBounce(bounce, mail);
}

/**
 * Handle Resend complaint event
 * Transforms Resend format to generic format and calls existing processor
 */
async function handleResendComplaint(event: any) {
  const data = event.data;
  
  // Extract recipient email from 'to' array
  const recipientEmail = Array.isArray(data.to) ? data.to[0] : data.to;
  
  // Transform Resend complaint format to generic format
  const complaint = {
    complainedRecipients: [{
      emailAddress: recipientEmail,
    }],
    timestamp: event.created_at,
    feedbackId: data.email_id,
    complaintFeedbackType: 'abuse', // Resend doesn't provide specific type
  };
  
  const mail = {
    messageId: data.email_id,
  };
  
  console.log('Processing Resend complaint:', {
    recipient: recipientEmail,
    emailId: data.email_id,
    timestamp: event.created_at,
  });
  
  // Use existing complaint processor (no changes needed!)
  await processComplaint(complaint, mail);
}

/**
 * POST handler for Resend webhook events
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

    // Get Svix headers for signature verification
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');
    const body = await request.text();
    
    // Verify webhook signature using Svix (if configured)
    if (process.env.RESEND_WEBHOOK_SECRET) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('Missing Svix webhook headers');
        return NextResponse.json({ error: 'Missing signature headers' }, { status: 403 });
      }
      
      let event: any;
      try {
        // Verify signature using Svix library
        const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
        const payload = wh.verify(body, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
        
        // Payload is now verified and parsed
        event = payload as any;
      } catch (error) {
        console.error('Invalid Svix signature:', error);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
      
      // Process events (separate try-catch so processing errors return 500, not 403)
      try {
        // Handle bounce events
        if (event.type === 'email.bounced') {
          await handleResendBounce(event);
          return NextResponse.json({ message: 'Bounce processed' });
        }
        
        // Handle complaint events
        if (event.type === 'email.complained') {
          await handleResendComplaint(event);
          return NextResponse.json({ message: 'Complaint processed' });
        }
        
        // Log other events but don't process
        console.log('Resend webhook event:', event.type);
        return NextResponse.json({ message: 'Event received' }, { status: 200 });
      } catch (error) {
        // Processing errors (e.g., database errors) should return 500
        console.error('Error processing Resend webhook event:', error);
        throw error; // Re-throw to be caught by outer catch block
      }
    } else {
      // No signature verification configured - parse body directly
      // WARNING: This is less secure and should only be used in development
      console.warn('[WARNING] RESEND_WEBHOOK_SECRET not configured. Webhook signature verification disabled.');
      
      const event = JSON.parse(body);
      
      // Process events (errors will be caught by outer catch block)
      if (event.type === 'email.bounced') {
        await handleResendBounce(event);
        return NextResponse.json({ message: 'Bounce processed' });
      }
      
      if (event.type === 'email.complained') {
        await handleResendComplaint(event);
        return NextResponse.json({ message: 'Complaint processed' });
      }
      
      return NextResponse.json({ message: 'Event received' }, { status: 200 });
    }
    
  } catch (error) {
    console.error('Resend webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

