import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import { disconnectSocket } from '@/lib/socket';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

type Stats = {
  postsCount: number;
  followersCount: number;
  followingCount: number;
};

export default function ProfileScreen() {
  const { user, clearAuth, setAuth, token } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    postsCount: 0,
    followersCount: user?.followersCount || 0,
    followingCount: user?.followingCount || 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch fresh profile data + posts count in parallel
      const [profileRes, postsRes] = await Promise.all([
        api.get('/api/profile/me'),
        api.get(`/api/profile/${user?._id}/posts`),
      ]);

      const freshUser = profileRes.data.user;
      const postsCount = postsRes.data.posts?.length || 0;

      // Update authStore with fresh data
      if (token) await setAuth(freshUser, token);

      setStats({
        postsCount,
        followersCount: freshUser.followersCount || 0,
        followingCount: freshUser.followingCount || 0,
      });
    } catch (_) {}
    finally { setRefreshing(false); }
  }, [user?._id, token]);

  // Refresh stats every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const handleLogout = async () => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Are you sure you want to sign out?')
      : true;
    if (!confirmed) return;
    disconnectSocket();
    await clearAuth();
    toast.info('Signed out successfully.');
    router.replace('/(auth)/login');
  };

  const statItems = [
    { label: 'Posts',     value: stats.postsCount },
    { label: 'Followers', value: stats.followersCount },
    { label: 'Following', value: stats.followingCount },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchStats(); }}
          tintColor={Colors.purple}
        />
      }
    >
      {/* Header gradient */}
      <LinearGradient
        colors={[Colors.purple + '40', Colors.cyan + '20', 'transparent']}
        style={styles.headerGradient}
      />

      <View style={styles.content}>
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <Avatar uri={user?.avatar} name={user?.userName} size={90} />
          <Text style={styles.userName}>{user?.userName}</Text>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="pencil-outline" size={15} color={Colors.purple} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {statItems.map((s, i) => (
            <View
              key={s.label}
              style={[styles.statItem, i < statItems.length - 1 && styles.statBorder]}
            >
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu items */}
        <View style={styles.menu}>
          {[
            { icon: 'link-outline',     label: 'My Links',    onPress: () => toast.info('Coming soon!') },
            { icon: 'document-outline', label: 'My Files',    onPress: () => toast.info('Coming soon!') },
            { icon: 'bookmark-outline', label: 'Saved Posts', onPress: () => toast.info('Coming soon!') },
            { icon: 'settings-outline', label: 'Settings',    onPress: () => router.push('/settings') },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color={Colors.purple} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200,
  },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', paddingTop: 30, marginBottom: 24 },
  userName: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 12 },
  bio: { color: Colors.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center', maxWidth: 260 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, backgroundColor: Colors.bgCard,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.purpleDim,
  },
  editBtnText: { color: Colors.purple, fontSize: 13, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 20, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  statValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  menu: { gap: 10, marginBottom: 24 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.purpleDim,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: Colors.error + '40',
  },
  logoutText: { color: Colors.error, fontWeight: '600', fontSize: 15 },
});
