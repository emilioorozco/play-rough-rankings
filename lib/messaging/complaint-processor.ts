// lib/messaging/complaint-processor.ts
import { prisma } from '@/lib/prisma';
import { addToSuppressionList } from './suppression-manager';
import { calculateEmailMetrics } from './rate-calculator';

/**
 * Process complaint notification from AWS SNS
 * Implements zero-tolerance policy: immediate suppression for all complaints
 */
export async function processComplaint(complaint: any, mail: any) {
  if (!complaint.complainedRecipients || complaint.complainedRecipients.length === 0) {
    return;
  }
  
  for (const recipient of complaint.complainedRecipients) {
    const email = recipient.emailAddress.toLowerCase();
    
    try {
      // Log complaint to channel-agnostic database model
      await logComplaint({
        recipient: email,
        channel: 'email', // Specify channel for this email implementation
        complaintType: complaint.complaintFeedbackType,
        userAgent: complaint.userAgent,
        feedbackId: complaint.feedbackId,
        messageId: mail.messageId,
        timestamp: new Date(complaint.timestamp),
      });
    } catch (error) {
      console.error('Error logging complaint for', email, ':', error);
      throw error;
    }
    
    // Immediately suppress - zero tolerance for complaints
    await addToSuppressionList({
      recipient: email,
      channel: 'email', // Specify channel
      reason: 'complaint',
      suppressionType: 'complaint',
    });
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
    
    return result;
  } catch (error) {
    console.error('Error creating complaint record:', error);
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
