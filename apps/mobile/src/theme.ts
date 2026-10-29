export const colors = {
  teal: '#0EA39A',
  tealDark: '#087C75',
  tealDeep: '#073F3B',
  ink: '#122523',
  muted: '#667875',
  canvas: '#F8F7F3',
  surface: '#FFFFFF',
  line: '#E4E7E1',
  softTeal: '#EAF5F3',
  paleTeal: '#F3F8F6',
  sand: '#F4EBDD',
  cream: '#FCFAF5',
  gold: '#B58A4A',
  danger: '#A33A3A',
  warning: '#8A5A12',
  success: '#237A57',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const shadow = {
  shadowColor: '#123B37',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 16,
  elevation: 2,
} as const;
