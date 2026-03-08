/**
 * Application Form - Accordion-based event application
 * Same fields as legacy form; uses v2 jury packets, application fields, add-ons; legacy apply/apply-with-packet.
 */

import { ApplicationFormProvider, useApplicationForm } from './ApplicationFormContext';
import { AccordionSection } from '../../../shared';
import {
  JuryPacketSection,
  PersonaSection,
  BasicInfoSection,
  BoothAddonsSection,
  RequirementsSection,
  FeesReviewSection
} from './sections';
import ApplicationPaymentModal from './ApplicationPaymentModal';

function ApplicationFormContent() {
  const {
    event,
    selectedPacket,
    showPacketChoice,
    juryPackets,
    personas,
    selectedPersona,
    formData,
    applicationFields,
    fieldResponses,
    selectedAddons,
    sectionStatus,
    activeSection,
    openSection,
    completeSection,
    showPaymentModal,
    draftApplication,
    setShowPaymentModal,
    onSubmit,
    applicationStats
  } = useApplicationForm();

  const getJurySummary = () => {
    if (selectedPacket) return `Using: ${selectedPacket.packet_name}`;
    if (showPacketChoice && juryPackets.length > 0) return 'Choose method';
    return 'From scratch';
  };

  const getPersonaSummary = () =>
    selectedPersona ? (selectedPersona.display_name || selectedPersona.persona_name) : 'Main profile';

  const sections = [
    {
      id: 'juryPacket',
      title: 'Application method',
      icon: 'fa-folder',
      component: JuryPacketSection,
      getSummary: getJurySummary,
      show: juryPackets.length > 0,
      nextSection: 'persona'
    },
    {
      id: 'persona',
      title: 'Apply as',
      icon: 'fa-user',
      component: PersonaSection,
      getSummary: getPersonaSummary,
      show: personas.length > 0,
      nextSection: 'basicInfo'
    },
    {
      id: 'basicInfo',
      title: 'Basic information',
      icon: 'fa-edit',
      component: BasicInfoSection,
      getSummary: () => (formData.artist_statement ? `${formData.artist_statement.slice(0, 40)}...` : '—'),
      show: true,
      nextSection: 'boothAddons'
    },
    {
      id: 'boothAddons',
      title: 'Booth & add-ons',
      icon: 'fa-plus-square',
      component: BoothAddonsSection,
      getSummary: () => {
        const n = selectedAddons.filter(a => a.requested).length;
        return n ? `${n} add-on(s) selected` : '—';
      },
      show: true,
      nextSection: 'requirements'
    },
    {
      id: 'requirements',
      title: 'Application requirements',
      icon: 'fa-list-alt',
      component: RequirementsSection,
      getSummary: () => {
        const n = Object.keys(fieldResponses).length;
        return n ? `${n} field(s) completed` : '—';
      },
      show: applicationFields.length > 0,
      nextSection: 'reviewSubmit'
    },
    {
      id: 'reviewSubmit',
      title: 'Review & submit',
      icon: 'fa-paper-plane',
      component: FeesReviewSection,
      getSummary: () => 'Review and submit',
      show: true,
      nextSection: null
    }
  ];

  const visibleSections = sections.filter(s => s.show);
  const firstSectionId = visibleSections[0]?.id;
  const effectiveActive = visibleSections.some(s => s.id === activeSection) ? activeSection : (firstSectionId || 'basicInfo');

  if (!event) {
    return <div className="alert alert-error">Event information not available.</div>;
  }

  return (
    <div className="application-form-accordion">
      <div className="form-panel" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Apply to {event.title}</h2>
        <p style={{ color: '#666', marginBottom: applicationStats ? '1rem' : 0 }}>Complete the sections below to submit your application.</p>
        {applicationStats && (
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#666' }}>
            <span><strong style={{ color: 'var(--primary-color)' }}>{applicationStats.total_applications ?? 0}</strong> total applications</span>
            {event.max_applications != null && (
              <span><strong style={{ color: 'var(--primary-color)' }}>{Math.max(0, (event.max_applications || 0) - (applicationStats.total_applications ?? 0))}</strong> spots remaining</span>
            )}
          </div>
        )}
      </div>

      {visibleSections.map((section, index) => {
        const SectionComponent = section.component;
        const isLast = index === visibleSections.length - 1;
        const status = sectionStatus[section.id] || (effectiveActive === section.id ? 'active' : 'pending');
        return (
          <AccordionSection
            key={section.id}
            id={section.id}
            title={section.title}
            icon={section.icon}
            status={status}
            isOpen={effectiveActive === section.id}
            summary={section.getSummary()}
            onToggle={(open) => { if (open) openSection(section.id); }}
            onNext={() => completeSection(section.id, section.nextSection)}
            showNext={!isLast}
            isLast={isLast}
          >
            <SectionComponent />
          </AccordionSection>
        );
      })}

      {showPaymentModal && draftApplication && (
        <ApplicationPaymentModal
          application={draftApplication}
          event={event}
          onSuccess={() => {
            setShowPaymentModal(false);
            if (onSubmit) onSubmit({ ...draftApplication, status: 'submitted' });
          }}
          onCancel={() => {
            setShowPaymentModal(false);
            if (onSubmit) onSubmit({ ...draftApplication, status: 'draft', message: 'Saved as draft. Complete payment to submit.' });
          }}
        />
      )}
    </div>
  );
}

export default function ApplicationForm({ event, user, onSubmit, onCancel }) {
  return (
    <ApplicationFormProvider event={event} user={user} onSubmit={onSubmit} onCancel={onCancel}>
      <ApplicationFormContent />
    </ApplicationFormProvider>
  );
}

export { ApplicationFormProvider, useApplicationForm } from './ApplicationFormContext';
