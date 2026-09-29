// Specific areas within each broad study field (QO5). Values are `${field}_${key}`; labels live in messages/*.json under
// questions.QO5D.options. Keep in sync with SPECIALISM_AREAS in the backend's scoring_engine.py (the backend only
// accepts these exact values, because they are put into AI prompts).
export const SPECIALISMS: Record<string, string[]> = {
  business: ['marketing', 'finance', 'accounting', 'hr', 'supply_chain', 'management', 'entrepreneurship', 'economics', 'other'],
  engineering: ['civil', 'mechanical', 'electrical', 'chemical_petroleum', 'industrial', 'biomedical', 'environmental', 'other'],
  computer_science: ['software', 'data_ai', 'cybersecurity', 'networks_it', 'information_systems', 'other'],
  medicine: ['general_medicine', 'nursing', 'pharmacy', 'dentistry', 'public_health', 'allied_health', 'other'],
  sciences: ['biology', 'chemistry', 'physics', 'math_stats', 'environmental', 'geology', 'other'],
  humanities: ['psychology', 'sociology', 'media_communication', 'languages', 'history', 'political_science', 'other'],
  arts: ['graphic_design', 'architecture_interior', 'fine_arts', 'film_media', 'music_performing', 'fashion', 'other'],
  education: ['early_childhood', 'primary', 'secondary', 'special_needs', 'leadership', 'other'],
  law: ['general', 'corporate', 'criminal', 'sharia', 'international', 'other'],
}
