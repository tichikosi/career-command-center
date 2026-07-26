import React from 'react';
import { Modal } from '@/components/ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void; // Keep Editing
  onConfirm: () => void; // Discard Changes
}

export function UnsavedChangesDialog({ isOpen, onClose, onConfirm }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Discard Unsaved Changes?"
      description="You have unsaved changes to your candidate overview. Are you sure you want to discard your edits and return to view mode?"
      confirmText="Discard Changes"
      cancelText="Keep Editing"
      isDanger={true}
    />
  );
}
