'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { JobOpportunity, PipelineStage } from '@/types/opportunity';
import { NetworkContact } from '@/types/network';
import { KanbanCard } from './KanbanCard';

const STAGE_COLUMNS: Array<{ stage: PipelineStage; label: string; accentColor: string }> = [
  { stage: 'Identified', label: 'Identified', accentColor: 'border-t-slate-500' },
  { stage: 'Applied', label: 'Applied', accentColor: 'border-t-blue-500' },
  { stage: 'Screening', label: 'Screening', accentColor: 'border-t-indigo-500' },
  { stage: 'Interviewing', label: 'Interviewing', accentColor: 'border-t-purple-500' },
  { stage: 'Offer', label: 'Offer', accentColor: 'border-t-emerald-500' },
  { stage: 'Archived', label: 'Archived', accentColor: 'border-t-slate-400' },
];

interface KanbanColumnProps {
  stage: PipelineStage;
  label: string;
  accentColor: string;
  opportunities: JobOpportunity[];
  networkContacts: NetworkContact[];
  onStageChange: (oppId: string, newStage: PipelineStage) => void;
}

function KanbanColumn({
  stage,
  label,
  accentColor,
  opportunities,
  networkContacts,
  onStageChange,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex flex-col min-w-[260px] max-w-[320px] flex-1 border-t-4 ${accentColor} transition-colors ${
        isOver ? 'bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-500/40' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          {label}
        </h3>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
          {opportunities.length}
        </span>
      </div>

      {/* Cards List */}
      <SortableContext
        items={opportunities.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
          {opportunities.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl text-[11px] text-slate-400">
              No opportunities in {label}
            </div>
          ) : (
            opportunities.map((opp) => (
              <KanbanCard
                key={opp.id}
                opportunity={opp}
                networkContacts={networkContacts}
                onStageChange={onStageChange}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface BoardProps {
  opportunities: JobOpportunity[];
  networkContacts: NetworkContact[];
  onStageChange: (oppId: string, newStage: PipelineStage) => void;
}

export function KanbanBoard({ opportunities, networkContacts, onStageChange }: BoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeOppId = String(active.id);
    const overId = String(over.id);

    // If dropped directly over a stage column
    const isStageColumn = STAGE_COLUMNS.some((c) => c.stage === overId);
    if (isStageColumn) {
      const newStage = overId as PipelineStage;
      const currentOpp = opportunities.find((o) => o.id === activeOppId);
      if (currentOpp && currentOpp.stage !== newStage) {
        onStageChange(activeOppId, newStage);
      }
      return;
    }

    // If dropped over another opportunity card in a column
    const overOpp = opportunities.find((o) => o.id === overId);
    if (overOpp) {
      const newStage = overOpp.stage;
      const currentOpp = opportunities.find((o) => o.id === activeOppId);
      if (currentOpp && currentOpp.stage !== newStage) {
        onStageChange(activeOppId, newStage);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start scrollbar-none">
        {STAGE_COLUMNS.map((col) => {
          const columnOpps = opportunities.filter((o) => o.stage === col.stage);
          return (
            <KanbanColumn
              key={col.stage}
              stage={col.stage}
              label={col.label}
              accentColor={col.accentColor}
              opportunities={columnOpps}
              networkContacts={networkContacts}
              onStageChange={onStageChange}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
