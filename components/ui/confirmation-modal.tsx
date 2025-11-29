"use client";

import React, { useState, useCallback, ReactNode } from "react";
import { Modal } from "./modal";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  error?: string;
  success?: string;
  autoCloseDelay?: number; // Custom auto-close delay in seconds (defaults to 4s after submission)
  loadingDelay?: number; // Delay in milliseconds to show loading state for better UX
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  error,
  success,
  autoCloseDelay,
  loadingDelay = 1000, // Default 1 second delay for better UX
}: ConfirmationModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [delayedSuccess, setDelayedSuccess] = useState<string | undefined>();
  const [delayedError, setDelayedError] = useState<string | undefined>();

  // Handle delayed success/error messages
  React.useEffect(() => {
    if (success && !internalLoading) {
      // Show success message after loading delay completes
      setDelayedSuccess(success);
    } else if (error && !internalLoading) {
      // Show error message after loading delay completes
      setDelayedError(error);
    } else if (internalLoading) {
      // Clear messages while loading
      setDelayedSuccess(undefined);
      setDelayedError(undefined);
    }
  }, [success, error, internalLoading]);

  const handleConfirm = useCallback(async () => {
    if (loadingDelay > 0) {
      setInternalLoading(true);
      try {
        await onConfirm();
        // Add loading delay for better UX
        await new Promise(resolve => setTimeout(resolve, loadingDelay));
      } finally {
        setInternalLoading(false);
      }
    } else {
      await onConfirm();
    }
  }, [onConfirm, loadingDelay]);

  const isActuallyLoading = isLoading || internalLoading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!isActuallyLoading}
      showCloseButton={false}
      error={delayedError}
      success={delayedSuccess}
      autoCloseDelay={autoCloseDelay ?? -1} // Use custom delay or default to submission-based auto-close
      onSubmit={handleConfirm}
      onCancel={onClose}
      isSubmitting={isActuallyLoading}
      isValid={!delayedError && !delayedSuccess} // Disable submit if there's an error or success
      submitLabel={isActuallyLoading ? "Processing..." : confirmLabel}
      cancelLabel={cancelLabel}
      showCancel={true}
      submitVariant={variant}
    >
      {children
        ? children
        : message && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {message}
            </p>
          )}
    </Modal>
  );
}
