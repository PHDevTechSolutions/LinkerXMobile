import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const {
    theme, notificationsEnabled,
    postNotifications, commentNotifications,
    followNotifications, messageNotifications,
    loadSettings, setTheme, toggleNotifications,
  } = useSettingsStore();

  // C is reactive — re-renders when theme changes
  const C = useColors();

  useEffect(() => { loadSettings(); }, []);

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: C.textMuted }]}>{title}</Text>
  );

  const SettingRow = ({
    icon, label, sublabel, value, onToggle, color,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    sublabel?: string;
    value: boolean;
    onToggle: () => void;
    color?: string;
  }) => {
    const iconColor = color || C.purple;
    return (
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: iconColor + '22' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{label}</Text>
          {sublabel ? <Text style={[styles.rowSublabel, { color: C.textMuted }]}>{sublabel}</Text> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: C.border, true: C.purple + '88' }}
          thumbColor={value ? C.purple : C.textMuted}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: C.bgElevated }]}
        >
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Appearance ── */}
        <SectionHeader title="APPEARANCE" />
        <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[styles.rowLabel, { color: C.textPrimary }]}>Theme</Text>
          <Text style={[styles.rowSublabel, { color: C.textMuted }]}>Choose your preferred look</Text>
          <View style={styles.themeRow}>
            {/* Dark */}
            <TouchableOpacity
              style={[
                styles.themeBtn,
                { backgroundColor: C.bgElevated, borderColor: theme === 'dark' ? C.purple : C.border },
              ]}
              onPress={() => setTheme('dark')}
            >
              {theme === 'dark' ? (
                <LinearGradient colors={[C.purple, C.cyan]} style={styles.themeBtnGradient}>
                  <Ionicons name="moon" size={18} color={C.white} />
                  <Text style={[styles.themeLabelActive, { color: C.white }]}>Dark</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name="moon-outline" size={18} color={C.textMuted} />
                  <Text style={[styles.themeLabel, { color: C.textMuted }]}>Dark</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Light */}
            <TouchableOpacity
              style={[
                styles.themeBtn,
                { backgroundColor: C.bgElevated, borderColor: theme === 'light' ? C.purple : C.border },
              ]}
              onPress={() => setTheme('light')}
            >
              {theme === 'light' ? (
                <LinearGradient colors={[C.purple, C.cyan]} style={styles.themeBtnGradient}>
                  <Ionicons name="sunny" size={18} color={C.white} />
                  <Text style={[styles.themeLabelActive, { color: C.white }]}>Light</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name="sunny-outline" size={18} color={C.textMuted} />
                  <Text style={[styles.themeLabel, { color: C.textMuted }]}>Light</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Notifications ── */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <SettingRow
            icon="notifications"
            label="Enable Notifications"
            sublabel="Master toggle for all notifications"
            value={notificationsEnabled}
            onToggle={() => toggleNotifications('notificationsEnabled')}
            color={C.cyan}
          />
        </View>

        <View style={[
          styles.card,
          { backgroundColor: C.bgCard, borderColor: C.border },
          !notificationsEnabled && styles.cardDisabled,
        ]}>
          <SettingRow
            icon="newspaper-outline"
            label="Post Notifications"
            sublabel="When someone you follow posts"
            value={postNotifications && notificationsEnabled}
            onToggle={() => toggleNotifications('postNotifications')}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            icon="chatbubble-outline"
            label="Comment Notifications"
            sublabel="When someone comments on your post"
            value={commentNotifications && notificationsEnabled}
            onToggle={() => toggleNotifications('commentNotifications')}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            icon="person-add-outline"
            label="Follow Notifications"
            sublabel="When someone follows you"
            value={followNotifications && notificationsEnabled}
            onToggle={() => toggleNotifications('followNotifications')}
            color={C.success}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            icon="mail-outline"
            label="Message Notifications"
            sublabel="When you receive a new message"
            value={messageNotifications && notificationsEnabled}
            onToggle={() => toggleNotifications('messageNotifications')}
            color={C.warning}
          />
        </View>

        {/* ── Account ── */}
        <SectionHeader title="ACCOUNT" />
        <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          {[
            { icon: 'lock-closed-outline' as const, label: 'Change Password', color: C.purple,   route: '/settings/change-password' },
            { icon: 'shield-outline'       as const, label: 'Privacy',         color: C.cyan,     route: '/settings/privacy' },
            { icon: 'help-circle-outline'  as const, label: 'Help & Support',  color: C.success,  route: '/settings/help' },
            { icon: 'information-circle-outline' as const, label: 'About LinkerX', color: C.textMuted, route: '/settings/about' },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.row} onPress={() => router.push(item.route as any)}>
                <View style={[styles.rowIcon, { backgroundColor: item.color + '22' }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={[styles.rowLabel, { flex: 1, color: C.textPrimary }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={[styles.version, { color: C.textMuted }]}>LinkerX v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

// Static layout-only styles — colors are applied inline via useColors()
const styles = StyleSheet.create({
  container:   { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content:     { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: 8, marginTop: 16, marginLeft: 4,
  },
  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 14, marginBottom: 4,
  },
  cardDisabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel:    { fontSize: 14, fontWeight: '500' },
  rowSublabel: { fontSize: 12, marginTop: 1 },
  divider:     { height: 1, marginVertical: 6 },
  themeRow:    { flexDirection: 'row', gap: 10, marginTop: 12 },
  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    overflow: 'hidden',
  },
  themeBtnGradient: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10,
  },
  themeLabel:      { fontSize: 14, fontWeight: '600' },
  themeLabelActive:{ fontSize: 14, fontWeight: '600' },
  version: { fontSize: 12, textAlign: 'center', marginTop: 24 },
});
