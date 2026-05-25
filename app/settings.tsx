import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';

export default function SettingsScreen() {
  const {
    theme, notificationsEnabled,
    postNotifications, commentNotifications,
    followNotifications, messageNotifications,
    loadSettings, setTheme, toggleNotifications,
  } = useSettingsStore();

  useEffect(() => { loadSettings(); }, []);

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const SettingRow = ({
    icon, label, sublabel, value, onToggle, color = Colors.purple,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    sublabel?: string;
    value: boolean;
    onToggle: () => void;
    color?: string;
  }) => (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.purple + '88' }}
        thumbColor={value ? Colors.purple : Colors.textMuted}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Theme */}
        <SectionHeader title="APPEARANCE" />
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Theme</Text>
          <Text style={styles.rowSublabel}>Choose your preferred look</Text>
          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[styles.themeBtn, theme === 'dark' && styles.themeBtnActive]}
              onPress={() => setTheme('dark')}
            >
              {theme === 'dark' ? (
                <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.themeBtnGradient}>
                  <Ionicons name="moon" size={18} color={Colors.white} />
                  <Text style={styles.themeLabelActive}>Dark</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name="moon-outline" size={18} color={Colors.textMuted} />
                  <Text style={styles.themeLabel}>Dark</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeBtn, theme === 'light' && styles.themeBtnActive]}
              onPress={() => setTheme('light')}
            >
              {theme === 'light' ? (
                <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.themeBtnGradient}>
                  <Ionicons name="sunny" size={18} color={Colors.white} />
                  <Text style={styles.themeLabelActive}>Light</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name="sunny-outline" size={18} color={Colors.textMuted} />
                  <Text style={styles.themeLabel}>Light</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={styles.card}>
          <SettingRow
            icon="notifications"
            label="Enable Notifications"
            sublabel="Master toggle for all notifications"
            value={notificationsEnabled}
            onToggle={() => toggleNotifications('notificationsEnabled')}
            color={Colors.cyan}
          />
        </View>

        <View style={[styles.card, !notificationsEnabled && styles.cardDisabled]}>
          <SettingRow
            icon="newspaper-outline"
            label="Post Notifications"
            sublabel="When someone you follow posts"
            value={postNotifications && notificationsEnabled}
            onToggle={() => toggleNotifications('postNotifications')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="chatbubble-outline"
            label="Comment Notifications"
            sublabel="When someone comments on your post"
            value={commentNotifications && notificationsEnabled}
            onToggle={() => toggleNotifications('commentNotifications')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="person-add-outline"
            label="Follow Notifications"
            sublabel="When someone follows you"
            value={followNotifications && notificationsEnabled}
            onToggle={() => toggleNotifications('followNotifications')}
            color={Colors.success}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="mail-outline"
            label="Message Notifications"
            sublabel="When you receive a new message"
            value={messageNotifications && notificationsEnabled}
            onToggle={() => toggleNotifications('messageNotifications')}
            color={Colors.warning}
          />
        </View>

        {/* Account */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.card}>
          {[
            { icon: 'lock-closed-outline' as const, label: 'Change Password', color: Colors.purple },
            { icon: 'shield-outline' as const, label: 'Privacy', color: Colors.cyan },
            { icon: 'help-circle-outline' as const, label: 'Help & Support', color: Colors.success },
            { icon: 'information-circle-outline' as const, label: 'About LinkerX', color: Colors.textMuted },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: item.color + '22' }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={[styles.rowLabel, { flex: 1 }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.version}>LinkerX v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 4,
  },
  cardDisabled: { opacity: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  rowSublabel: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  themeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border,
  },
  themeBtnActive: { borderColor: Colors.purple },
  themeBtnGradient: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10,
  },
  themeLabel: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  themeLabelActive: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  version: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 24 },
});
