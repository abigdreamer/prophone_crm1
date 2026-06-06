import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppTheme } from '../context/ThemeContext';
import { createContact, updateContact } from '../services/api';
import type { ContactsStackParamList } from '../navigation/ContactsStack';
import type { Contact } from '../types/contact';

type Props = NativeStackScreenProps<ContactsStackParamList, 'LeadForm'>;

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGES = [
  { value: 'new',            label: 'New',           color: '#94a3b8' },
  { value: 'contacted',      label: 'Contacted',     color: '#38bdf8' },
  { value: 'engaged',        label: 'Engaged',       color: '#3b82f6' },
  { value: 'demo_scheduled', label: 'Demo Sched.',   color: '#a78bfa' },
  { value: 'demo_done',      label: 'Demo Done',     color: '#7c3aed' },
  { value: 'proposal_sent',  label: 'Proposal Sent', color: '#f59e0b' },
  { value: 'negotiating',    label: 'Negotiating',   color: '#f97316' },
  { value: 'customer',       label: 'Customer',      color: '#22c55e' },
  { value: 'not_qualified',  label: 'Not Qualified', color: '#9ca3af' },
  { value: 'lost',           label: 'Lost',          color: '#ef4444' },
  { value: 'churned',        label: 'Churned',       color: '#991b1b' },
];

// ─── Form state ──────────────────────────────────────────────────────────────

type FormState = {
  firstName: string; lastName: string; title: string;
  phone: string; email: string; website: string;
  address: string; city: string; state: string; zip: string;
  lifecycleStage: string; leadScore: string;
  company: string; accountSize: string; trucks: string;
  estRevenue: string; contractValue: string; yearsInBusiness: string;
  serviceAreaMiles: string; dispatcherSoftware: string;
  source: string; campaign: string;
  servicesOffered: string; motorClubAffiliations: string; painPoints: string;
  facebook: string; instagram: string; linkedin: string; tiktok: string;
  notes: string; tags: string;
};

function initForm(c?: Contact): FormState {
  return {
    firstName:             c?.firstName            ?? '',
    lastName:              c?.lastName             ?? '',
    title:                 c?.title                ?? '',
    phone:                 c?.phone                ?? '',
    email:                 c?.email                ?? '',
    website:               c?.website              ?? '',
    address:               c?.address              ?? '',
    city:                  c?.city                 ?? '',
    state:                 c?.state                ?? '',
    zip:                   c?.zip                  ?? '',
    lifecycleStage:        c?.lifecycleStage       ?? 'new',
    leadScore:             String(c?.leadScore      ?? 0),
    company:               c?.company              ?? '',
    accountSize:           c?.accountSize          ?? '',
    trucks:                String(c?.trucks         ?? ''),
    estRevenue:            c?.estRevenue           ?? '',
    contractValue:         String(c?.contractValue  ?? ''),
    yearsInBusiness:       String(c?.yearsInBusiness ?? ''),
    serviceAreaMiles:      String(c?.serviceAreaMiles ?? ''),
    dispatcherSoftware:    c?.dispatcherSoftware   ?? '',
    source:                c?.source               ?? '',
    campaign:              c?.campaign             ?? '',
    servicesOffered:       c?.servicesOffered      ?? '',
    motorClubAffiliations: c?.motorClubAffiliations ?? '',
    painPoints:            c?.painPoints           ?? '',
    facebook:              c?.facebook             ?? '',
    instagram:             c?.instagram            ?? '',
    linkedin:              c?.linkedin             ?? '',
    tiktok:                c?.tiktok               ?? '',
    notes:                 c?.notes                ?? '',
    tags:                  c?.tags                 ?? '',
  };
}

// ─── Sub-components (defined at module level — NEVER inside the screen) ───────

function SectionHeader({
  label, icon, isOpen, onToggle,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={14} color={C.primary} />
        </View>
        <Text style={styles.sectionTitle}>{label}</Text>
      </View>
      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
    </TouchableOpacity>
  );
}

function Field({
  label, value, onChange, placeholder, keyboard, error, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: React.ComponentProps<typeof TextInput>['keyboardType'];
  error?: string;
  required?: boolean;
}) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}{required && <Text style={{ color: C.error }}> *</Text>}
      </Text>
      <TextInput
        style={[styles.fieldInput, !!error && styles.fieldInputError]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboard ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function TextArea({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.textArea}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function LeadFormScreen({ route, navigation }: Props) {
  const contact = route.params?.contact;
  const isEdit  = !!contact;
  const { C }   = useAppTheme();
  const insets  = useSafeAreaInsets();
  const styles  = useMemo(() => makeStyles(C), [C]);

  const [form, setForm]               = useState<FormState>(() => initForm(contact));
  const [openSections, setOpen]       = useState<Set<string>>(new Set(['contact']));
  const [stagePicker, setStagePicker] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Partial<Record<keyof FormState, string>>>({});

  const set = (key: keyof FormState) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  function toggleSection(id: string) {
    setOpen(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim())  e.lastName  = 'Required';
    setErrors(e);
    if (Object.keys(e).length > 0) setOpen(prev => new Set([...prev, 'contact']));
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Partial<Contact> = {
        firstName:             form.firstName.trim(),
        lastName:              form.lastName.trim(),
        title:                 form.title.trim(),
        phone:                 form.phone.trim(),
        email:                 form.email.trim(),
        website:               form.website.trim(),
        address:               form.address.trim(),
        city:                  form.city.trim(),
        state:                 form.state.trim(),
        zip:                   form.zip.trim(),
        lifecycleStage:        form.lifecycleStage,
        leadScore:             Number(form.leadScore) || 0,
        company:               form.company.trim(),
        accountSize:           form.accountSize.trim(),
        trucks:                Number(form.trucks) || 0,
        estRevenue:            form.estRevenue.trim(),
        contractValue:         Number(form.contractValue) || 0,
        yearsInBusiness:       Number(form.yearsInBusiness) || 0,
        serviceAreaMiles:      Number(form.serviceAreaMiles) || 0,
        dispatcherSoftware:    form.dispatcherSoftware.trim(),
        source:                form.source.trim(),
        campaign:              form.campaign.trim(),
        servicesOffered:       form.servicesOffered.trim(),
        motorClubAffiliations: form.motorClubAffiliations.trim(),
        painPoints:            form.painPoints.trim(),
        facebook:              form.facebook.trim(),
        instagram:             form.instagram.trim(),
        linkedin:              form.linkedin.trim(),
        tiktok:                form.tiktok.trim(),
        notes:                 form.notes.trim(),
        tags:                  form.tags.trim(),
      };
      if (isEdit && contact?.id) {
        await updateContact(contact.id, payload);
      } else {
        await createContact(payload);
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const currentStage = STAGES.find(s => s.value === form.lifecycleStage) ?? STAGES[0];
  const tog = (id: string) => () => toggleSection(id);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Section 1: Contact Info ── */}
          <View style={styles.section}>
            <SectionHeader label="Contact Info" icon="person-outline" isOpen={openSections.has('contact')} onToggle={tog('contact')} />
            {openSections.has('contact') && (
              <View style={styles.sectionBody}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="First Name" value={form.firstName} onChange={set('firstName')}
                      placeholder="First name" required error={errors.firstName} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Last Name" value={form.lastName} onChange={set('lastName')}
                      placeholder="Last name" required error={errors.lastName} />
                  </View>
                </View>
                <Field label="Title"   value={form.title}   onChange={set('title')}   placeholder="Job title" />
                <Field label="Phone"   value={form.phone}   onChange={set('phone')}   placeholder="(555) 000-0000"       keyboard="phone-pad" />
                <Field label="Email"   value={form.email}   onChange={set('email')}   placeholder="email@example.com"    keyboard="email-address" />
                <Field label="Website" value={form.website} onChange={set('website')} placeholder="https://website.com"  keyboard="url" />
                <Field label="Address" value={form.address} onChange={set('address')} placeholder="Street address" />
                <View style={styles.row}>
                  <View style={{ flex: 2 }}>
                    <Field label="City"  value={form.city}  onChange={set('city')}  placeholder="City" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="State" value={form.state} onChange={set('state')} placeholder="State" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Zip"   value={form.zip}   onChange={set('zip')}   placeholder="Zip" keyboard="number-pad" />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ── Section 2: Pipeline ── */}
          <View style={styles.section}>
            <SectionHeader label="Pipeline" icon="trending-up-outline" isOpen={openSections.has('pipeline')} onToggle={tog('pipeline')} />
            {openSections.has('pipeline') && (
              <View style={styles.sectionBody}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Lead Stage</Text>
                  <TouchableOpacity
                    style={[styles.stagePickerBtn, { borderColor: currentStage.color + '66', backgroundColor: currentStage.color + '18' }]}
                    onPress={() => setStagePicker(true)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.stageDot, { backgroundColor: currentStage.color }]} />
                    <Text style={[styles.stagePickerText, { color: currentStage.color }]}>{currentStage.label}</Text>
                    <Ionicons name="chevron-down" size={14} color={currentStage.color} />
                  </TouchableOpacity>
                </View>
                <Field label="Lead Score" value={form.leadScore} onChange={set('leadScore')} placeholder="0" keyboard="number-pad" />
              </View>
            )}
          </View>

          {/* ── Section 3: Company & Account ── */}
          <View style={styles.section}>
            <SectionHeader label="Company & Account" icon="business-outline" isOpen={openSections.has('company')} onToggle={tog('company')} />
            {openSections.has('company') && (
              <View style={styles.sectionBody}>
                <Field label="Company" value={form.company} onChange={set('company')} placeholder="Company name" />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Account Size" value={form.accountSize} onChange={set('accountSize')} placeholder="e.g. 1–5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Trucks" value={form.trucks} onChange={set('trucks')} placeholder="0" keyboard="number-pad" />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Est. Revenue" value={form.estRevenue} onChange={set('estRevenue')} placeholder="$0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Contract ($)" value={form.contractValue} onChange={set('contractValue')} placeholder="0" keyboard="number-pad" />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Years in Business" value={form.yearsInBusiness} onChange={set('yearsInBusiness')} placeholder="0" keyboard="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Service Area (mi)" value={form.serviceAreaMiles} onChange={set('serviceAreaMiles')} placeholder="0" keyboard="number-pad" />
                  </View>
                </View>
                <Field label="Dispatcher Software" value={form.dispatcherSoftware} onChange={set('dispatcherSoftware')} placeholder="e.g. Omadi" />
                <Field label="Source"   value={form.source}   onChange={set('source')}   placeholder="e.g. Cold Call" />
                <Field label="Campaign" value={form.campaign} onChange={set('campaign')} placeholder="Campaign name" />
              </View>
            )}
          </View>

          {/* ── Section 4: Services & Operations ── */}
          <View style={styles.section}>
            <SectionHeader label="Services & Operations" icon="construct-outline" isOpen={openSections.has('services')} onToggle={tog('services')} />
            {openSections.has('services') && (
              <View style={styles.sectionBody}>
                <TextArea label="Services Offered"       value={form.servicesOffered}       onChange={set('servicesOffered')}       placeholder="Heavy Duty, Semi Recovery, Accident..." />
                <TextArea label="Motor Club Affiliations" value={form.motorClubAffiliations} onChange={set('motorClubAffiliations')} placeholder="State Farm, NSD..." />
                <TextArea label="Pain Points"             value={form.painPoints}             onChange={set('painPoints')}             placeholder="Key pain points or challenges..." />
              </View>
            )}
          </View>

          {/* ── Section 5: Social Links ── */}
          <View style={styles.section}>
            <SectionHeader label="Social Links" icon="share-social-outline" isOpen={openSections.has('social')} onToggle={tog('social')} />
            {openSections.has('social') && (
              <View style={styles.sectionBody}>
                <Field label="Facebook"  value={form.facebook}  onChange={set('facebook')}  placeholder="facebook.com/..."      keyboard="url" />
                <Field label="Instagram" value={form.instagram} onChange={set('instagram')} placeholder="instagram.com/..."     keyboard="url" />
                <Field label="LinkedIn"  value={form.linkedin}  onChange={set('linkedin')}  placeholder="linkedin.com/in/..."   keyboard="url" />
                <Field label="TikTok"    value={form.tiktok}    onChange={set('tiktok')}    placeholder="tiktok.com/@..."       keyboard="url" />
              </View>
            )}
          </View>

          {/* ── Section 6: Notes ── */}
          <View style={styles.section}>
            <SectionHeader label="Notes" icon="document-text-outline" isOpen={openSections.has('notes')} onToggle={tog('notes')} />
            {openSections.has('notes') && (
              <View style={styles.sectionBody}>
                <TextArea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Add notes about this contact..." />
              </View>
            )}
          </View>

          {/* ── Section 7: Tags ── */}
          <View style={styles.section}>
            <SectionHeader label="Tags" icon="pricetag-outline" isOpen={openSections.has('tags')} onToggle={tog('tags')} />
            {openSections.has('tags') && (
              <View style={styles.sectionBody}>
                <Field label="Tags" value={form.tags} onChange={set('tags')} placeholder="tag1, tag2, tag3 (comma-separated)" />
                {!!form.tags.trim() && (
                  <View style={styles.tagsPreview}>
                    {form.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                      <View key={i} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Floating Save Bar ── */}
      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Lead'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stage Picker Modal ── */}
      <Modal visible={stagePicker} transparent animationType="slide" onRequestClose={() => setStagePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStagePicker(false)} />
        <View style={[styles.stageSheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Lead Stage</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {STAGES.map(s => {
              const active = form.lifecycleStage === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.stageOption, active && { backgroundColor: s.color + '18' }]}
                  onPress={() => { set('lifecycleStage')(s.value); setStagePicker(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.stageOptionDot, { backgroundColor: s.color }]} />
                  <Text style={[styles.stageOptionText, { color: active ? s.color : C.text }]}>{s.label}</Text>
                  {active && <Ionicons name="checkmark" size={16} color={s.color} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const makeStyles = (C: ReturnType<typeof useAppTheme>['C']) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingTop: 12 },

  section: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  sectionBody:  { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: C.cardBorder },

  row:       { flexDirection: 'row', gap: 10 },
  fieldWrap: { marginTop: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSub, marginBottom: 6 },
  fieldInput: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, color: C.text,
  },
  fieldInputError: { borderColor: C.error },
  fieldError:      { fontSize: 11, color: C.error, marginTop: 4 },
  textArea: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, color: C.text, minHeight: 80,
  },

  stagePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
  },
  stageDot:        { width: 9, height: 9, borderRadius: 5 },
  stagePickerText: { flex: 1, fontSize: 14, fontWeight: '600' },

  tagsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagChip:     { backgroundColor: C.primaryDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagChipText: { fontSize: 12, color: C.primaryLight, fontWeight: '600' },

  saveBar: {
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.cardBorder,
  },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  stageSheet: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: C.cardBorder,
    paddingHorizontal: 16, paddingTop: 12, maxHeight: '70%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.cardBorder, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle:      { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  stageOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4,
  },
  stageOptionDot:  { width: 10, height: 10, borderRadius: 5 },
  stageOptionText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
