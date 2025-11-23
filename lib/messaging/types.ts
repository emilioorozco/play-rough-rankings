// lib/messaging/types.ts

/**
 * Message Channel Constants
 * 
 * Defines the communication channels supported by the messaging system.
 * This provides a single source of truth for channel values across the application.
 * 
 * Current implementation focuses on email, with SMS support planned for future.
 */

export const MessageChannel = {
  EMAIL: 'email',
  SMS: 'sms',
} as const;

export type MessageChannel = typeof MessageChannel[keyof typeof MessageChannel];

/**
 * Type guard to check if a string is a valid MessageChannel
 */
export function isMessageChannel(value: string): value is MessageChannel {
  return Object.values(MessageChannel).includes(value as MessageChannel);
}
