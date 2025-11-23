// lib/messaging/complaint-processor.ts
import { prisma } from '@/lib/prisma';
import { addToSuppressionList } from './suppression-manager';
import { calculateEmailMetrics } from './rate-calculator';

/**
 * Process complaint notification from AWS SNS
 * Implements zero-tolerance policy: immediate suppression for all complaints
 */
export async function processComplaint(complaint: any, mail: any) {
  console.log('[DEBUG] processComplaint called:', {
    complaintType: complaint.complaintFeedbackType,
    recipients: complaint.complainedRecipients?.length || 0,
    mailMessageId: mail?.messageId,
  });
  
  if (!complaint.complainedRecipients || complaint.complainedRecipients.length === 0) {
    console.warn('[DEBUG] No complained recipients found in complaint notification');
    return;
  }
  
  for (const recipient of complaint.complainedRecipients) {
    const email = recipient.emailAddress.toLowerCase();
    console.log('[DEBUG] Processing complaint for recipient:', email);
    
    try {
      // Log complaint to channel-agnostic database model
      console.log('[DEBUG] Calling logComplaint with data:', {
        recipient: email,
        complaintType: complaint.complaintFeedbackType,
        messageId: mail.messageId,
      });
      
      await logComplaint({
        recipient: email,
        channel: 'email', // Specify channel for this email implementation
        complaintType: complaint.complaintFeedbackType,
        userAgent: complaint.userAgent,
        feedbackId: complaint.feedbackId,
        messageId: mail.messageId,
        timestamp: new Date(complaint.timestamp),
      });
      
      console.log('[DEBUG] logComplaint completed successfully for:', email);
    } catch (error) {
      console.error('[DEBUG] Error in logComplaint for', email, ':', error);
      throw error; // Re-throw to see the actual error
    }
    
    // Immediately suppress - zero tolerance for complaints
    await addToSuppressionList({
      recipient: email,
      channel: 'email', // Specify channel
      reason: 'complaint',
      suppressionType: 'complaint',
    });
    
    console.log(`Complaint: ${email} added to suppression list`);
  }
  
  // Calculate and log current email metrics after processing complaints
  // This helps monitor complaint rates in real-time
  try {
    await calculateEmailMetrics({ channel: 'email' });
  } catch (error) {
    console.error('Failed to calculate email metrics after complaint processing:', error);
  }
}

/**
 * Log complaint event to channel-agnostic database model
 */
async function logComplaint(data: {
  recipient: string;
  channel: string;
  complaintType?: string;
  userAgent?: string;
  feedbackId?: string;
  messageId?: string;
  timestamp: Date;
}) {
  console.log('[DEBUG] logComplaint - Creating complaint record:', {
    recipient: data.recipient,
    channel: data.channel,
    complaintType: data.complaintType,
    messageId: data.messageId,
  });
  
  try {
    const result = await prisma.messageComplaint.create({
      data: {
        recipient: data.recipient,
        channel: data.channel,
        complaintType: data.complaintType,
        userAgent: data.userAgent,
        feedbackId: data.feedbackId,
        messageId: data.messageId,
        timestamp: data.timestamp,
      },
    });
    
    console.log('[DEBUG] logComplaint - Successfully created complaint record:', {
      id: result.id,
      recipient: result.recipient,
      complaintType: result.complaintType,
    });
    
    return result;
  } catch (error) {
    console.error('[DEBUG] logComplaint - Error creating complaint record:', error);
    console.error('[DEBUG] logComplaint - Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Get complaint history for a recipient (channel-agnostic)
 */
export async function getComplaintHistory(recipient: string, channel: string = 'email') {
  return prisma.messageComplaint.findMany({
    where: { 
      recipient: recipient.toLowerCase(),
      channel,
    },
    orderBy: { timestamp: 'desc' },
  });
}
