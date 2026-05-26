import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl,
  Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { disconnectSocket } from '@/lib/socket';
import { toast } from '@/lib/toast';
import { uploadImage, uploadImageFromWeb } from '@/lib/cloudinary';
import api from '@/lib/api';

type Stats = {
  postsCount: number;
  followersCount: number;
  followingCount: number;
};

export default function ProfileScreen() {
  const { user, clearAuth, setAuth, token } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const C = useColors();
  const [stats, setStats] = useState<Stats>({
    postsCount: 0,
    followersCount: user?.followersCount || 0,
    followingCount: user?.followingCount || 0,
  });
  const [refreshing, setRefreshing]       = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get('/api/profile/me'),
        api.get(`/api/profile/${user?._id}/posts`),
      ]);
      const freshUser  = profileRes.data.user;
      const postsCount = postsRes.data.posts?.length || 0;
      // Merge fresh data — preserve any fields not returned by the API
      if (token) await setAuth({ ...user, ...freshUser }, token);
      setStats({
        postsCount,
        followersCount: freshUser.followersCount || 0,
        followingCount: freshUser.followingCount || 0,
      });
    } catch (_) {}
    finally { setRefreshing(false); }
  }, [user?._id, token]);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  // ── Cover photo picker ────────────────────────────────────────────────────
  const pickCover = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverUploading(true);
        try {
          const { url } = await uploadImageFromWeb(file, 'linkerx/covers');
          await api.put('/api/profile/update', { coverPhoto: url });
          if (token) await setAuth({ ...user!, coverPhoto: url }, token);
          toast.success('Cover photo updated!');
        } catch (err: any) {
          toast.error(err.message || 'Upload failed.');
        } finally {
          setCoverUploading(false);
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9] as [number, number],
        quality: 0.85,
      });
      if (result.canceled) return;
      setCoverUploading(true);
      try {
        const { url } = await uploadImage(result.assets[0].uri, 'linkerx/covers');
        await api.put('/api/profile/update', { coverPhoto: url });
        if (token) await setAuth({ ...user!, coverPhoto: url }, token);
        toast.success('Cover photo updated!');
      } catch (err: any) {
        toast.error(err.message || 'Upload failed.');
      } finally {
        setCoverUploading(false);
      }
    }
  };

  const handleLogout = async () => {
    const confirmed =
      typeof window !== 'undefined'
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

  const menuItems = [
    {
      icon: 'link-outline'    as const,
      label: 'My Links',
      sub: 'Your saved links',
      onPress: () => router.push('/profile/links' as any),
    },
    {
      icon: 'document-outline' as const,
      label: 'My Files',
      sub: 'Your uploaded files',
      onPress: () => router.push('/profile/files' as any),
    },
    {
      icon: 'bookmark-outline' as const,
      label: 'Saved Posts',
      sub: 'Posts you bookmarked',
      onPress: () => router.push('/profile/saved' as any),
    },
    {
      icon: 'settings-outline' as const,
      label: 'Settings',
      sub: 'Account & preferences',
      onPress: () => router.push('/settings'),
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.bg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchStats(); }}
          tintColor={C.purple}
        />
      }
    >
      {/* ── Cover photo ── */}
      <View style={styles.coverWrap}>
        {user?.coverPhoto ? (
          <Image source={{ uri: user.coverPhoto }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[C.purple + '99', C.cyan + '66', C.bg]}
            style={styles.coverGradient}
          />
        )}

        {/* Notification bell — top right */}
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => router.push('/notifications' as any)}
        >
          <Ionicons name="notifications-outline" size={20} color={C.white} />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Edit cover button */}
        <TouchableOpacity
          style={styles.editCoverBtn}
          onPress={pickCover}
          disabled={coverUploading}
        >
          {coverUploading ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <Ionicons name="camera-outline" size={16} color={C.white} />
          )}
          <Text style={styles.editCoverText}>
            {coverUploading ? 'Uploading...' : 'Edit Cover'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* ── Avatar + name ── */}
        <View style={styles.avatarSection}>
          {/* Avatar overlaps cover */}
          <View style={[styles.avatarWrap, { borderColor: C.bg, backgroundColor: C.bg }]}>
            <Avatar uri={user?.avatar} name={user?.userName} size={90} />
          </View>
          <Text style={[styles.userName, { color: C.textPrimary }]}>{user?.userName}</Text>
          {user?.bio ? <Text style={[styles.bio, { color: C.textMuted }]}>{user.bio}</Text> : null}

          <TouchableOpacity style={[styles.editBtn, { backgroundColor: C.bgCard, borderColor: C.purpleDim }]} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="pencil-outline" size={15} color={C.purple} />
            <Text style={[styles.editBtnText, { color: C.purple }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={[styles.statsRow, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          {statItems.map((s, i) => (
            <View
              key={s.label}
              style={[styles.statItem, i < statItems.length - 1 && [styles.statBorder, { borderRightColor: C.border }]]}
            >
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Menu ── */}
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={[styles.menuItem, { backgroundColor: C.bgCard, borderColor: C.border }]} onPress={item.onPress}>
              <View style={[styles.menuIcon, { backgroundColor: C.purpleDim }]}>
                <Ionicons name={item.icon} size={20} color={C.purple} />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuLabel, { color: C.textPrimary }]}>{item.label}</Text>
                <Text style={[styles.menuSub, { color: C.textMuted }]}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: C.bgCard, borderColor: C.error + '40' }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={C.error} />
          <Text style={[styles.logoutText, { color: C.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const COVER_HEIGHT = 200;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  coverWrap: { height: COVER_HEIGHT, position: 'relative' },
  coverImage: { width: '100%', height: COVER_HEIGHT },
  coverGradient: { width: '100%', height: COVER_HEIGHT },
  editCoverBtn: {
    position: 'absolute', bottom: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  editCoverText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  notifBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  notifBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: Colors.error, borderRadius: 9,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2, borderColor: Colors.bgCard,
  },
  notifBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '800' },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrap: {
    marginTop: -45,
    borderWidth: 4, borderColor: Colors.bg,
    borderRadius: 50, backgroundColor: Colors.bg,
  },
  userName: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 10 },
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
  statItem:  { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder:{ borderRightWidth: 1, borderRightColor: Colors.border },
  statValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  menu: { gap: 10, marginBottom: 24 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.purpleDim,
    alignItems: 'center', justifyContent: 'center',
  },
  menuText:  { flex: 1 },
  menuLabel: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  menuSub:   { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: Colors.error + '40',
  },
  logoutText: { color: Colors.error, fontWeight: '600', fontSize: 15 },
});
