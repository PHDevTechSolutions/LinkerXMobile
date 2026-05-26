import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

export default function ChangePasswordScreen() {
  const C = useColors();
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    if (!current.trim()) return toast.warning('Enter your current password.');
    if (next.length < 6) return toast.warning('New password must be at least 6 characters.');
    if (next !== confirm) return toast.warning('Passwords do not match.');
    setLoading(true);
    try {
      await api.post('/api/change-password', { currentPassword: current, newPassword: next });
      toast.success('Password changed successfully!');
      setCurrent(''); setNext(''); setConfirm('');
      setTimeout(() => router.back(), 800);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({
    label, value, onChange, show, onToggleShow, placeholder,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggleShow: () => void; placeholder: string;
  }) => (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: C.textMuted }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: C.bgCard, borderColor: C.border }]}>
        <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} />
        <TextInput
          style={[styles.input, { color: C.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggleShow}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Change Password</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Icon */}
        <View style={styles.iconWrap}>
          <LinearGradient colors={[C.purple, C.cyan]} style={styles.iconGradient}>
            <Ionicons name="lock-closed" size={32} color={C.white} />
          </LinearGradient>
          <Text style={[styles.iconTitle, { color: C.textPrimary }]}>Update your password</Text>
          <Text style={[styles.iconSub, { color: C.textMuted }]}>Choose a strong password with at least 6 characters.</Text>
        </View>

        <Field label="CURRENT PASSWORD" value={current} onChange={setCurrent}
          show={showCurrent} onToggleShow={() => setShowCurrent((v) => !v)}
          placeholder="Enter current password" />
        <Field label="NEW PASSWORD" value={next} onChange={setNext}
          show={showNext} onToggleShow={() => setShowNext((v) => !v)}
          placeholder="Enter new password" />
        <Field label="CONFIRM NEW PASSWORD" value={confirm} onChange={setConfirm}
          show={showConfirm} onToggleShow={() => setShowConfirm((v) => !v)}
          placeholder="Confirm new password" />

        {/* Strength indicator */}
        {next.length > 0 && (
          <View style={styles.strengthWrap}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={[
                styles.strengthBar,
                { backgroundColor: next.length >= i * 3 ? (next.length >= 10 ? C.success : C.warning) : C.border },
              ]} />
            ))}
            <Text style={[styles.strengthLabel, { color: next.length >= 10 ? C.success : C.warning }]}>
              {next.length < 6 ? 'Too short' : next.length < 10 ? 'Fair' : 'Strong'}
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={handleSubmit} disabled={loading} style={{ marginTop: 24 }}>
          <LinearGradient colors={[C.purple, C.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={[styles.submitText, { color: C.white }]}>Change Password</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content:     { padding: 20, paddingBottom: 48 },
  iconWrap:    { alignItems: 'center', marginBottom: 32, gap: 10 },
  iconGradient:{ width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconTitle:   { fontSize: 18, fontWeight: '700', marginTop: 4 },
  iconSub:     { fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 18 },
  fieldWrap:   { marginBottom: 16 },
  fieldLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  input:       { flex: 1, fontSize: 14 },
  strengthWrap:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:{ fontSize: 12, fontWeight: '600', minWidth: 60 },
  submitBtn:   { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitText:  { fontWeight: '700', fontSize: 16 },
});
