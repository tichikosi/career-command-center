import React, { useState, useEffect, useRef } from 'react';
import { CandidateProfile, CareerRole, EvidenceItem } from '@/types/candidate';
import { EvidenceCard } from './EvidenceCard';

interface Props {
  profile: CandidateProfile;
  selectedEvidenceId?: string;
}

export function EvidenceLibrarySection({ profile, selectedEvidenceId }: Props) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Deep-link scroll & temporary highlight effect
  useEffect(() => {
    if (!selectedEvidenceId) return;

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Wait for DOM readiness via requestAnimationFrame
    const rafId = requestAnimationFrame(() => {
      setHighlightedId(selectedEvidenceId);
      const domId = `evidence-card-${encodeURIComponent(selectedEvidenceId)}`;
      const element = document.getElementById(domId);

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

      if (element) {
        element.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
      } else if (sectionRef.current) {
        sectionRef.current.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      }
    });

    // Auto-clear highlight ring after 2.5 seconds
    timerRef.current = setTimeout(() => {
      setHighlightedId(null);
    }, 2500);

    return () => {
      cancelAnimationFrame(rafId);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedEvidenceId]);

  // Active Role Lookup Map
  const roleMap = new Map<string, CareerRole>();
  if (Array.isArray(profile.careerHistory)) {
    for (const role of profile.careerHistory) {
      if (role && role.id) {
        roleMap.set(role.id, role);
      }
    }
  }

  // Source Lookup Map
  const sourceMap = new Map<string, string>();
  if (Array.isArray(profile.sources)) {
    for (const src of profile.sources) {
      if (src && src.id && src.name) {
        sourceMap.set(src.id, src.name);
      }
    }
  }

  // Classify evidence items into Assigned vs Unassigned
  const assignedItems: { evidence: EvidenceItem; role: CareerRole }[] = [];
  const unassignedItems: EvidenceItem[] = [];

  if (Array.isArray(profile.evidenceItems)) {
    for (const ev of profile.evidenceItems) {
      if (!ev || !ev.id) continue;
      const matchedRole = ev.roleId ? roleMap.get(ev.roleId) : undefined;

      if (matchedRole) {
        assignedItems.push({ evidence: ev, role: matchedRole });
      } else {
        unassignedItems.push(ev);
      }
    }
  }

  if (profile.evidenceItems.length === 0) {
    return null;
  }

  return (
    <div ref={sectionRef} id="evidence-library-section" className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
      {/* Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Candidate Evidence Library ({profile.evidenceItems.length} Total Records)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Canonical index of verified achievements, metrics, skills, and legacy evidence artifacts
          </p>
        </div>
      </div>

      {/* Group A: Assigned Evidence */}
      {assignedItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Assigned Role Evidence ({assignedItems.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {assignedItems.map(({ evidence, role }) => (
              <EvidenceCard
                key={evidence.id}
                evidence={evidence}
                roleInfo={{ title: role.title, company: role.company }}
                sourceLabel={evidence.sourceId ? sourceMap.get(evidence.sourceId) : null}
                isHighlighted={highlightedId === evidence.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Group B: Unassigned Evidence */}
      {unassignedItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Unassigned Evidence ({unassignedItems.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {unassignedItems.map((evidence) => (
              <EvidenceCard
                key={evidence.id}
                evidence={evidence}
                roleInfo={null}
                sourceLabel={evidence.sourceId ? sourceMap.get(evidence.sourceId) : null}
                isHighlighted={highlightedId === evidence.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
