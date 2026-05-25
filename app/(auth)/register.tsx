import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

export default function RegisterScreen() {
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!userName || !email || !password) return toast.warning('All fields are required.');
    if (password.length < 6) return toast.warning('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await api.post('/api/register', { userName, Email: email, Password: password });
      toast.success('Account created! Please sign in.');
      setTimeout(() => router.replace('/(auth)/login'), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.logoCircle}>
            <Ionicons name="link" size={32} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.appName}>Linker X</Text>
          <Text style={styles.tagline}>Join the community</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start sharing and connecting</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={Colors.textMuted}
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password (6+ characters)"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.purple, Colors.gradientMid, Colors.cyan]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.switchLink}>
            <Text style={styles.switchText}>
              Already have an account? <Text style={styles.switchHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  btn: {
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  switchLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  switchHighlight: {
    color: Colors.purpleLight,
    fontWeight: '600',
  },
});
