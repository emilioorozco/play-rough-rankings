// lib/messaging/index.ts
// Central export file for messaging module

// Types
export * from './types';

// Bounce processing
export {
  processBounce,
  getBounceHistory,
  getSoftBounceCount,
} from './bounce-processor';

// Complaint processing
export {
  processComplaint,
  getComplaintHistory,
} from './complaint-processor';

// Suppression management
export {
  addToSuppressionList,
  isRecipientSuppressed,
  getSuppressionDetails,
  removeFromSuppressionList,
  incrementSoftBounceCount,
  getAllSuppressedRecipients,
  getSuppressionStats,
} from './suppression-manager';

// Delivery logging
export {
  logMessageDelivery,
  getDeliveryLogs,
  getDeliveryStats,
} from './delivery-logger';

// Rate calculation
export {
  calculateEmailMetrics,
  getBounceRateBreakdown,
  checkSESCompliance,
  type EmailMetrics,
} from './rate-calculator';

