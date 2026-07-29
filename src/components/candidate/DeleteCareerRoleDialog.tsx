import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { CareerRole } from '@/types/candidate';

interface Props {
  isOpen: boolean;
  role: CareerRole | null;
  linkedEvidenceCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteCareerRoleDialog({
  isOpen,
  role,
  linkedEvidenceCount,
  onClose,
  onConfirm,
}: Props) {
  if (!role) return null;

  const dateStr = `${role.startDate} – ${role.endDate}`;
  const baseCopy = `Are you sure you want to delete the ${role.title} role at ${role.company} (${dateStr})? This action cannot be undone.`;
  const evidenceCopy =
    linkedEvidenceCount > 0
      ? ` This role has ${linkedEvidenceCount} linked evidence ${
          linkedEvidenceCount === 1 ? 'item' : 'items'
        }. The role will be removed, but its evidence will remain in your evidence library as unassigned evidence.`
      : '';

  const fullDescription = `${baseCopy}${evidenceCopy}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Career Role?"
      description={fullDescription}
      confirmText="Delete Role"
      cancelText="Cancel"
      isDanger={true}
    />
  );
}
