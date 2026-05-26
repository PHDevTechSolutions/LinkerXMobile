// ─── Dark theme ───────────────────────────────────────────────────────────────
export const DarkColors = {
  bg:           '#0D0D1A',
  bgCard:       '#13131F',
  bgElevated:   '#1A1A2E',

  purple:       '#7C3AED',
  purpleLight:  '#A855F7',
  purpleDim:    '#7C3AED33',
  cyan:         '#06B6D4',
  cyanLight:    '#22D3EE',
  cyanDim:      '#06B6D433',

  gradientStart: '#7C3AED',
  gradientMid:   '#4F46E5',
  gradientEnd:   '#06B6D4',

  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted:     '#475569',

  border:        '#1E1E3A',
  borderLight:   '#2D2D4E',

  success: '#10B981',
  error:   '#EF4444',
  warning: '#F59E0B',

  white:   '#FFFFFF',
  black:   '#000000',
  overlay: 'rgba(0,0,0,0.6)',
};

// ─── Light theme ──────────────────────────────────────────────────────────────
export const LightColors = {
  bg:           '#F8F9FF',
  bgCard:       '#FFFFFF',
  bgElevated:   '#EEF0FF',

  purple:       '#7C3AED',
  purpleLight:  '#A855F7',
  purpleDim:    '#7C3AED22',
  cyan:         '#0891B2',
  cyanLight:    '#06B6D4',
  cyanDim:      '#0891B222',

  gradientStart: '#7C3AED',
  gradientMid:   '#4F46E5',
  gradientEnd:   '#0891B2',

  textPrimary:   '#0F172A',
  textSecondary: '#334155',
  textMuted:     '#94A3B8',

  border:        '#E2E8F0',
  borderLight:   '#CBD5E1',

  success: '#10B981',
  error:   '#EF4444',
  warning: '#F59E0B',

  white:   '#FFFFFF',
  black:   '#000000',
  overlay: 'rgba(0,0,0,0.4)',
};

// Static fallback — used in StyleSheet.create() calls (always dark)
// For reactive theming in components, use the useColors() hook instead
export const Colors = DarkColors;
