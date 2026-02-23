/**
 * Application Form Context
 * State for accordion-based event application form (jury packet, persona, basic info, add-ons, requirements, submit).
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchJuryPackets, fetchJuryPacket, createJuryPacket, uploadJuryPacketFiles } from '../../../../lib/events/api';
import { getEventApplicationStats, applyToEvent, applyWithPacket, addAddonRequest } from '../../../../lib/applications/api';
import { fetchApplicationFields, fetchAvailableAddons } from '../../../../lib/events/api';
import { getPersonas } from '../../../../lib/users/api';
import { getCurrentUser } from '../../../../lib/users/api';

const ApplicationFormContext = createContext(null);

export function useApplicationForm() {
  const ctx = useContext(ApplicationFormContext);
  if (!ctx) throw new Error('useApplicationForm must be used within ApplicationFormProvider');
  return ctx;
}

function parsePacketData(packet) {
  if (!packet?.packet_data) return {};
  const raw = packet.packet_data;
  return typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
}

export function ApplicationFormProvider({ children, event, user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    artist_statement: '',
    portfolio_url: '',
    additional_info: '',
    additional_notes: ''
  });
  const [juryPackets, setJuryPackets] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [showPacketChoice, setShowPacketChoice] = useState(true);
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [applicationFields, setApplicationFields] = useState([]);
  const [fieldResponses, setFieldResponses] = useState({});
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [applicationStats, setApplicationStats] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sectionStatus, setSectionStatus] = useState({});
  const [activeSection, setActiveSection] = useState('juryPacket');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [draftApplication, setDraftApplication] = useState(null);
  const [showSavePacketForm, setShowSavePacketForm] = useState(false);
  const [packetName, setPacketName] = useState('');

  const setFormField = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const loadData = useCallback(async () => {
    if (!event?.id) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const [packetsRes, fieldsRes, addonsRes, statsRes, personasRes, meRes] = await Promise.all([
        fetchJuryPackets().then(d => ({ data: d })).catch(() => ({ data: [] })),
        fetchApplicationFields(event.id).then(d => ({ data: d })).catch(() => ({ data: [] })),
        fetchAvailableAddons(event.id).then(d => ({ data: d })).catch(() => ({ data: [] })),
        getEventApplicationStats(event.id).then(s => ({ data: s })).catch(() => ({ data: null })),
        getPersonas().then(d => ({ data: Array.isArray(d) ? d : [] })).catch(() => ({ data: [] })),
        getCurrentUser().then(d => ({ data: d })).catch(() => ({ data: {} }))
      ]);

      setJuryPackets(Array.isArray(packetsRes.data) ? packetsRes.data : []);
      setShowPacketChoice((packetsRes.data?.length || 0) > 0);
      setApplicationFields(Array.isArray(fieldsRes.data) ? fieldsRes.data : []);
      setAvailableAddons(Array.isArray(addonsRes.data) ? addonsRes.data : []);
      setApplicationStats(statsRes.data);
      setPersonas(Array.isArray(personasRes.data) ? personasRes.data : []);
      const defaultPersona = (personasRes.data || []).find(p => p.is_default);
      if (defaultPersona) setSelectedPersona(defaultPersona);
      setIsVerified((meRes.data?.permissions || []).includes('verified'));
    } catch (e) {
      console.error('Application form load error:', e);
      setError(e.message || 'Failed to load form data');
    }
  }, [event?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (user?.id && !selectedPacket) {
      setFormData(prev => ({ ...prev, portfolio_url: `/artist/${user.id}` }));
    }
  }, [user?.id, selectedPacket]);

  useEffect(() => {
    if (selectedPersona) {
      setFormData(prev => ({ ...prev, portfolio_url: `/persona/${selectedPersona.id}` }));
    } else if (user?.id && !selectedPacket) {
      setFormData(prev => ({ ...prev, portfolio_url: `/artist/${user.id}` }));
    }
  }, [selectedPersona, user?.id, selectedPacket]);

  const openSection = useCallback((id) => {
    setActiveSection(id);
    setSectionStatus(prev => ({ ...prev, [id]: prev[id] || 'active' }));
  }, []);

  const completeSection = useCallback((id, nextId) => {
    setSectionStatus(prev => ({ ...prev, [id]: 'complete' }));
    if (nextId) setActiveSection(nextId);
  }, []);

  const handlePacketSelect = useCallback(async (packet) => {
    try {
      setLoading(true);
      setError(null);
      const full = await fetchJuryPacket(packet.id);
      const packetData = parsePacketData(full);
      setFormData(prev => ({
        ...prev,
        artist_statement: packetData.artist_statement || '',
        portfolio_url: packetData.portfolio_url || prev.portfolio_url,
        additional_info: prev.additional_info,
        additional_notes: prev.additional_notes
      }));
      if (packetData.field_responses) {
        const byName = {};
        applicationFields.forEach(f => {
          const nameLower = (f.field_name || '').toLowerCase();
          for (const [oldId, r] of Object.entries(packetData.field_responses)) {
            if ((r.field_name || '').toLowerCase() === nameLower) {
              byName[f.id] = r;
              break;
            }
          }
        });
        setFieldResponses(prev => Object.keys(byName).length ? byName : prev);
      }
      if (full.persona_id) {
        const p = personas.find(x => x.id === full.persona_id);
        if (p) setSelectedPersona(p);
      }
      setSelectedPacket(full);
      setShowPacketChoice(false);
    } catch (e) {
      setError(e.message || 'Failed to load packet');
    } finally {
      setLoading(false);
    }
  }, [applicationFields, personas]);

  const handleStartFromScratch = useCallback(() => {
    setShowPacketChoice(false);
    setSelectedPacket(null);
  }, []);

  const handleChangePacket = useCallback(() => {
    setSelectedPacket(null);
    setShowPacketChoice(true);
    setFormData({ artist_statement: '', portfolio_url: user ? `/artist/${user.id}` : '', additional_info: '', additional_notes: '' });
    setFieldResponses({});
  }, [user]);

  const handleFieldResponse = useCallback(async (fieldId, value, file = null) => {
    if (file) {
      try {
        const urls = await uploadJuryPacketFiles([file]);
        setFieldResponses(prev => ({
          ...prev,
          [fieldId]: { response_value: file.name, file_url: urls[0] }
        }));
      } catch (e) {
        setError(e.message || 'Failed to upload');
      }
    } else {
      setFieldResponses(prev => ({
        ...prev,
        [fieldId]: { response_value: value, file_url: null }
      }));
    }
  }, []);

  const handleAddonToggle = useCallback((addonId, requested) => {
    setSelectedAddons(prev => {
      const existing = prev.find(a => a.available_addon_id === addonId);
      if (existing) return prev.map(a => a.available_addon_id === addonId ? { ...a, requested } : a);
      return [...prev, { available_addon_id: addonId, requested, priority: 0, notes: '' }];
    });
  }, []);

  const handleAddonNotes = useCallback((addonId, notes) => {
    setSelectedAddons(prev => {
      const existing = prev.find(a => a.available_addon_id === addonId);
      if (existing) return prev.map(a => a.available_addon_id === addonId ? { ...a, notes } : a);
      return [...prev, { available_addon_id: addonId, requested: false, priority: 0, notes }];
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!event?.id) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        artist_statement: formData.artist_statement,
        portfolio_url: formData.portfolio_url,
        additional_info: formData.additional_info,
        additional_notes: formData.additional_notes,
        persona_id: selectedPersona?.id || null
      };
      const data = selectedPacket
        ? await applyWithPacket(event.id, selectedPacket.id, { additional_info: body.additional_info, additional_notes: body.additional_notes })
        : await applyToEvent(event.id, body);

      const app = data.application || data;
      if (data.requires_payment) {
        setDraftApplication(app);
        setShowPaymentModal(true);
        setLoading(false);
        return;
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token && selectedAddons.length > 0) {
        const toSave = selectedAddons.filter(a => a.requested);
        for (const addon of toSave) {
          try {
            await addAddonRequest(app.id, {
              available_addon_id: addon.available_addon_id,
              requested: true,
              notes: addon.notes || ''
            });
          } catch (e) {
            console.error('Addon request failed:', e);
          }
        }
      }
      if (onSubmit) onSubmit(app);
    } catch (e) {
      setError(e.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  }, [event?.id, formData, selectedPersona, selectedPacket, selectedAddons, onSubmit]);

  const handleSaveAsPacket = useCallback(async () => {
    if (!packetName.trim()) {
      setError('Packet name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fieldResponsesWithNames = {};
      Object.entries(fieldResponses).forEach(([fieldId, r]) => {
        const field = applicationFields.find(f => f.id == fieldId);
        fieldResponsesWithNames[fieldId] = { ...r, field_name: field?.field_name || null };
      });
      await createJuryPacket({
        packet_name: packetName.trim(),
        packet_data: {
          artist_statement: formData.artist_statement,
          portfolio_url: formData.portfolio_url,
          field_responses: fieldResponsesWithNames
        },
        photos_data: [],
        persona_id: selectedPersona?.id || null
      });
      const list = await fetchJuryPackets();
      setJuryPackets(Array.isArray(list) ? list : []);
      setShowSavePacketForm(false);
      setPacketName('');
    } catch (e) {
      setError(e.message || 'Failed to save packet');
    } finally {
      setLoading(false);
    }
  }, [packetName, formData, fieldResponses, applicationFields, selectedPersona]);

  const calculateTotalFees = useCallback(() => {
    if (!event) return 0;
    let t = 0;
    if (event.application_fee) t += parseFloat(event.application_fee);
    if (event.jury_fee) t += parseFloat(event.jury_fee);
    return t;
  }, [event]);

  const calculateBoothFees = useCallback(() => {
    if (!event) return 0;
    let t = parseFloat(event.booth_fee) || 0;
    selectedAddons.forEach(a => {
      if (!a.requested) return;
      const addon = availableAddons.find(x => x.id === a.available_addon_id);
      if (addon?.addon_price) t += parseFloat(addon.addon_price);
    });
    return t;
  }, [event, selectedAddons, availableAddons]);

  const value = {
    event,
    user,
    onSubmit,
    onCancel,
    formData,
    setFormField,
    juryPackets,
    selectedPacket,
    showPacketChoice,
    setShowPacketChoice,
    personas,
    selectedPersona,
    setSelectedPersona,
    applicationFields,
    fieldResponses,
    handleFieldResponse,
    availableAddons,
    selectedAddons,
    handleAddonToggle,
    handleAddonNotes,
    applicationStats,
    isVerified,
    loading,
    error,
    setError,
    sectionStatus,
    activeSection,
    openSection,
    completeSection,
    handlePacketSelect,
    handleStartFromScratch,
    handleChangePacket,
    handleSubmit,
    handleSaveAsPacket,
    showPaymentModal,
    setShowPaymentModal,
    draftApplication,
    setDraftApplication,
    showSavePacketForm,
    setShowSavePacketForm,
    packetName,
    setPacketName,
    loadData,
    calculateTotalFees,
    calculateBoothFees
  };

  return (
    <ApplicationFormContext.Provider value={value}>
      {children}
    </ApplicationFormContext.Provider>
  );
}
