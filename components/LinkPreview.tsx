import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import api from '@/lib/api';

type OGPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  hostname: string;
};

type Props = {
  url: string;
  compact?: boolean; // compact mode for chat bubbles
};

// Simple in-memory cache so the same URL isn't fetched twice
const cache: Record<string, OGPreview | null> = {};

export default function LinkPreview({ url, compact = false }: Props) {
  const C = useColors();
  const [preview, setPreview] = useState<OGPreview | null>(cache[url] ?? null);
  const [loading, setLoading] = useState(cache[url] === undefined);
  const [failed, setFailed]   = useState(false);

  useEffect(() => {
    if (cache[url] !== undefined) {
      setPreview(cache[url]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get(`/api/links/preview?url=${encodeURIComponent(url)}`)
      .then(({ data }) => {
        if (cancelled) return;
        cache[url] = data.preview;
        setPreview(data.preview);
      })
      .catch(() => {
        if (cancelled) return;
        cache[url] = null;
        setFailed(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <View style={[styles.skeleton, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
        <ActivityIndicator size="small" color={C.purple} />
        <Text style={[styles.skeletonText, { color: C.textMuted }]}>Loading preview...</Text>
      </View>
    );
  }

  if (failed || !preview) return null;

  if (compact) {
    // Compact version for chat bubbles
    return (
      <TouchableOpacity
        style={[styles.compact, { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.15)' }]}
        onPress={() => Linking.openURL(url)}
        activeOpacity={0.8}
      >
        {preview.favicon && (
          <Image source={{ uri: preview.favicon }} style={styles.compactFavicon} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.compactHostname} numberOfLines={1}>{preview.hostname}</Text>
          {preview.title && (
            <Text style={styles.compactTitle} numberOfLines={1}>{preview.title}</Text>
          )}
        </View>
        <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    );
  }

  // Full card for feed posts
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: C.bgElevated, borderColor: C.border }]}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.85}
    >
      {preview.image && (
        <Image source={{ uri: preview.image }} style={styles.cardImage} resizeMode="cover" />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardMeta}>
          {preview.favicon && (
            <Image source={{ uri: preview.favicon }} style={styles.favicon} />
          )}
          <Text style={[styles.hostname, { color: C.cyan }]} numberOfLines={1}>
            {preview.siteName || preview.hostname}
          </Text>
        </View>
        {preview.title && (
          <Text style={[styles.cardTitle, { color: C.textPrimary }]} numberOfLines={2}>
            {preview.title}
          </Text>
        )}
        {preview.description && (
          <Text style={[styles.cardDesc, { color: C.textMuted }]} numberOfLines={2}>
            {preview.description}
          </Text>
        )}
        <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
          <Ionicons name="link-outline" size={12} color={C.textMuted} />
          <Text style={[styles.cardUrl, { color: C.textMuted }]} numberOfLines={1}>{url}</Text>
          <Ionicons name="open-outline" size={12} color={C.cyan} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8,
  },
  skeletonText: { fontSize: 12 },

  // Compact (chat)
  compact: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 7,
    marginTop: 6,
  },
  compactFavicon:  { width: 16, height: 16, borderRadius: 3 },
  compactHostname: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  compactTitle:    { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 1 },

  // Full card (feed)
  card: {
    borderRadius: 14, borderWidth: 1,
    overflow: 'hidden', marginBottom: 10,
  },
  cardImage: { width: '100%', height: 160 },
  cardBody:  { padding: 12, gap: 4 },
  cardMeta:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  favicon:   { width: 16, height: 16, borderRadius: 3 },
  hostname:  { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  cardDesc:  { fontSize: 12, lineHeight: 17 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardUrl: { flex: 1, fontSize: 11 },
});
