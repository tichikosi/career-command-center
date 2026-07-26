import React from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { OverviewDraft } from '@/lib/candidateAdapter';
import { EditableStringList } from './EditableStringList';
import { CompensationPreferencesSection } from './CompensationPreferencesSection';
import { WorkAuthorizationSection } from './WorkAuthorizationSection';

interface Props {
  draft: OverviewDraft;
  onChange: (fields: Partial<OverviewDraft>) => void;
  errors: Record<string, string>;
  minSalaryRef?: React.RefObject<HTMLInputElement | null>;
  maxSalaryRef?: React.RefObject<HTMLInputElement | null>;
  visaTypeRef?: React.RefObject<HTMLInputElement | null>;
}

export function CareerTargetsSection({
  draft,
  onChange,
  errors,
  minSalaryRef,
  maxSalaryRef,
  visaTypeRef,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Career Targets Card */}
      <Card padding="lg" className="space-y-6">
        <CardHeader
          title="Career Targets & Preferences"
          subtitle="Target executive roles, industries, locations, compensation, and work authorization"
        />

        <EditableStringList
          label="Target Roles"
          description="Specify job titles or leadership functions you are actively targeting."
          items={draft.targetRoles}
          onChange={(targetRoles) => onChange({ targetRoles })}
          placeholder="e.g. VP of Operations, Chief of Staff..."
          maxItems={15}
          maxItemLength={80}
        />

        <EditableStringList
          label="Target Industries"
          description="Sectors or verticals where your executive domain experience applies."
          items={draft.targetIndustries}
          onChange={(targetIndustries) => onChange({ targetIndustries })}
          placeholder="e.g. Enterprise Software, B2B SaaS, HealthTech..."
          maxItems={15}
          maxItemLength={80}
        />

        <EditableStringList
          label="Preferred Locations"
          description="Cities, regions, or work arrangements (e.g. Remote, Hybrid, SF Bay Area)."
          items={draft.preferredLocations}
          onChange={(preferredLocations) => onChange({ preferredLocations })}
          placeholder="e.g. Remote, San Francisco, New York..."
          maxItems={15}
          maxItemLength={80}
        />

        {/* Structured Compensation Section */}
        <CompensationPreferencesSection
          preferences={draft.compensationPreferences}
          onChange={(compensationPreferences) => onChange({ compensationPreferences })}
          errors={errors}
          minSalaryRef={minSalaryRef}
          maxSalaryRef={maxSalaryRef}
        />

        {/* Structured Work Authorization Section */}
        <WorkAuthorizationSection
          details={draft.workAuthorizationDetails}
          onChange={(workAuthorizationDetails) => onChange({ workAuthorizationDetails })}
          errors={errors}
          visaTypeRef={visaTypeRef}
        />
      </Card>

      {/* Core Competencies Card */}
      <Card padding="lg" className="space-y-4">
        <CardHeader
          title="Core Competencies & Capabilities"
          subtitle="Primary executive skills, operational disciplines, and leadership domains"
        />

        <EditableStringList
          label="Core Competencies"
          description="Highlight top skills evaluated by recruiters and executive match engines."
          items={draft.coreCompetencies}
          onChange={(coreCompetencies) => onChange({ coreCompetencies })}
          placeholder="e.g. Operational Strategy, Cross-Functional Leadership, P&L Management..."
          maxItems={25}
          maxItemLength={80}
        />
      </Card>
    </div>
  );
}
