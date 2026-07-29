import React, { useState } from 'react';
import { CandidateProfile, CareerRole, EvidenceItem } from '@/types/candidate';
import {
  CareerRoleDraft,
  getOrderedCareerRoles,
  moveCareerRole,
  getEvidenceLinkedToRole,
  deleteCareerRoleFromProfile,
} from '@/lib/candidateAdapter';
import { generateId } from '@/lib/idUtils';
import { CareerRoleCard } from './CareerRoleCard';
import { CareerRoleEditorPanel } from './CareerRoleEditorPanel';
import { DeleteCareerRoleDialog } from './DeleteCareerRoleDialog';

interface Props {
  profile: CandidateProfile;
  onUpdateProfile: (updated: CandidateProfile) => void;
}

export function CareerHistorySection({ profile, onUpdateProfile }: Props) {
  const [editingRole, setEditingRole] = useState<CareerRole | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingRole, setDeletingRole] = useState<CareerRole | null>(null);

  // Evidence Item Lookup Map
  const evidenceMap = new Map<string, EvidenceItem>();
  if (Array.isArray(profile.evidenceItems)) {
    for (const ev of profile.evidenceItems) {
      if (ev && ev.id && !evidenceMap.has(ev.id)) {
        evidenceMap.set(ev.id, ev);
      }
    }
  }

  // Visible ordered career roles
  const orderedRoles = getOrderedCareerRoles(profile.careerHistory);

  const handleStartAdd = () => {
    setEditingRole(null);
    setIsAdding(true);
  };

  const handleStartEdit = (role: CareerRole) => {
    setIsAdding(false);
    setEditingRole(role);
  };

  const handleCancelEditor = () => {
    setIsAdding(false);
    setEditingRole(null);
  };

  const handleMoveUp = (role: CareerRole) => {
    const updatedHistory = moveCareerRole(profile.careerHistory, role.id, 'up');
    if (updatedHistory === profile.careerHistory) return;

    onUpdateProfile({
      ...profile,
      careerHistory: updatedHistory,
      dataMode: 'user',
      updatedAt: new Date().toISOString(),
    });
  };

  const handleMoveDown = (role: CareerRole) => {
    const updatedHistory = moveCareerRole(profile.careerHistory, role.id, 'down');
    if (updatedHistory === profile.careerHistory) return;

    onUpdateProfile({
      ...profile,
      careerHistory: updatedHistory,
      dataMode: 'user',
      updatedAt: new Date().toISOString(),
    });
  };

  const handleStartDelete = (role: CareerRole) => {
    setDeletingRole(role);
  };

  const handleConfirmDelete = () => {
    if (!deletingRole) return;

    // Safely close editor if currently editing the deleted role
    if (editingRole?.id === deletingRole.id) {
      setEditingRole(null);
      setIsAdding(false);
    }

    const nowStr = new Date().toISOString();
    const updatedProfile = deleteCareerRoleFromProfile(profile, deletingRole.id, nowStr);

    onUpdateProfile(updatedProfile);
    setDeletingRole(null);
  };

  const handleSaveRole = (draft: CareerRoleDraft) => {
    const nowStr = new Date().toISOString();
    const existingRoles = Array.isArray(profile.careerHistory) ? [...profile.careerHistory] : [];
    let updatedHistory: CareerRole[];

    if (draft.id) {
      // Edit existing role: preserve position, id, createdAt, displayOrder, evidenceItemIds, sourceIds
      const targetIndex = existingRoles.findIndex((r) => r.id === draft.id);
      if (targetIndex >= 0) {
        const targetRole = existingRoles[targetIndex];
        const updatedRole: CareerRole = {
          ...targetRole,
          company: draft.company,
          title: draft.title,
          location: draft.location,
          startDate: draft.startDate,
          endDate: draft.endDate,
          isCurrent: draft.isCurrent,
          summary: draft.summary,
          skills: draft.skills,
          updatedAt: nowStr,
        };
        updatedHistory = [...existingRoles];
        updatedHistory[targetIndex] = updatedRole;
      } else {
        updatedHistory = existingRoles;
      }
    } else {
      // Add new role: assign sparse displayOrder = (minDisplayOrder - 100) or 0
      const existingOrders = existingRoles
        .map((r) => r.displayOrder)
        .filter((ord): ord is number => typeof ord === 'number' && !isNaN(ord));

      let newDisplayOrder = 0;
      if (existingOrders.length > 0) {
        const minOrder = Math.min(...existingOrders);
        newDisplayOrder = minOrder - 100;
      }

      const newRole: CareerRole = {
        id: generateId('role'),
        company: draft.company,
        title: draft.title,
        location: draft.location,
        startDate: draft.startDate,
        endDate: draft.endDate,
        isCurrent: draft.isCurrent,
        summary: draft.summary,
        skills: draft.skills,
        evidenceItemIds: [],
        sourceIds: [],
        createdAt: nowStr,
        updatedAt: nowStr,
        displayOrder: newDisplayOrder,
      };

      // Prepend to top of array
      updatedHistory = [newRole, ...existingRoles];
    }

    const isInitiallyEmptySingleton =
      profile.dataMode === 'user' && !profile.name && profile.careerHistory.length === 0;

    const finalCandidateId = isInitiallyEmptySingleton
      ? generateId('cand-user')
      : profile.id || generateId('cand-user');

    const updatedProfile: CandidateProfile = {
      ...profile,
      id: finalCandidateId,
      careerHistory: updatedHistory,
      updatedAt: nowStr,
      dataMode: 'user',
    };

    onUpdateProfile(updatedProfile);
    setIsAdding(false);
    setEditingRole(null);
  };

  // Build initial draft for editor panel
  const currentEditorDraft: CareerRoleDraft | null = isAdding
    ? {
        company: '',
        title: '',
        location: '',
        startDate: '',
        endDate: 'Present',
        isCurrent: true,
        summary: '',
        skills: [],
        evidenceItemIds: [],
      }
    : editingRole
    ? {
        id: editingRole.id,
        company: editingRole.company || '',
        title: editingRole.title || '',
        location: editingRole.location || '',
        startDate: editingRole.startDate || '',
        endDate: editingRole.endDate || 'Present',
        isCurrent: Boolean(editingRole.isCurrent),
        summary: editingRole.summary || '',
        skills: Array.isArray(editingRole.skills) ? [...editingRole.skills] : [],
        evidenceItemIds: editingRole.evidenceItemIds || [],
        sourceIds: editingRole.sourceIds || [],
        displayOrder: editingRole.displayOrder,
        createdAt: editingRole.createdAt,
      }
    : null;

  // Actual resolved linked evidence count for deletion dialog
  const deletingLinkedEvidence = deletingRole
    ? getEvidenceLinkedToRole(profile, deletingRole.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Career History ({orderedRoles.length} Roles)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Executive positions, leadership functions, and verified evidence indexes
          </p>
        </div>

        {!isAdding && !editingRole && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
          >
            + Add Career Role
          </button>
        )}
      </div>

      {/* Editor Panel (If Active) */}
      {currentEditorDraft && (
        <CareerRoleEditorPanel
          key={currentEditorDraft.id || 'new-role'}
          initialDraft={currentEditorDraft}
          onSave={handleSaveRole}
          onCancel={handleCancelEditor}
        />
      )}

      {/* Role Cards List */}
      <div className="space-y-4">
        {orderedRoles.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No career roles configured yet. Click &ldquo;Add Career Role&rdquo; to add your first executive role.
            </p>
          </div>
        ) : (
          orderedRoles.map((role, idx) => (
            <CareerRoleCard
              key={role.id}
              role={role}
              evidenceMap={evidenceMap}
              isFirst={idx === 0}
              isLast={idx === orderedRoles.length - 1}
              onEdit={handleStartEdit}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onDelete={handleStartDelete}
            />
          ))
        )}
      </div>

      {/* Safe Delete Role Confirmation Modal */}
      <DeleteCareerRoleDialog
        isOpen={Boolean(deletingRole)}
        role={deletingRole}
        linkedEvidenceCount={deletingLinkedEvidence.length}
        onClose={() => setDeletingRole(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
