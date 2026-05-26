import { useSettingsStore } from '@/store/settingsStore';
import { DarkColors, LightColors } from '@/constants/Colors';

/**
 * Returns the correct color palette based on the current theme setting.
 * Use this hook in components that need to react to theme changes.
 *
 * Example:
 *   const C = useColors();
 *   <View style={{ backgroundColor: C.bg }} />
 */
export function useColors() {
  const theme = useSettingsStore((s) => s.theme);
  return theme === 'light' ? LightColors : DarkColors;
}
