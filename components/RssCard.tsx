import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image: string | null;
  feedTitle: string;
  feedFavicon: string | null;
  feedUrl: string;
  subscriptionId: string;
};

type Props = { item: RssItem };

export default function RssCard({ item }: Props) {
  const C = useColors();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}
      onPress={() => Linking.openURL(item.link)}
      activeOpacity={0.85}
    >
      {/* Feed source header */}
      <View style={styles.source}>
        {item.feedFavicon
          ? <Image source={{ uri: item.feedFavicon }} style={styles.favicon} />
          : <View style={[styles.faviconFallback, { backgroundColor: C.purpleDim }]}>
              <Ionicons name="newspaper-outline" size={12} color={C.purple} />
            </View>
        }
        <Text style={[styles.feedTitle, { color: C.cyan }]} numberOfLines={1}>{item.feedTitle}</Text>
        <Text style={[styles.pubDate, { color: C.textMuted }]}>{formatDate(item.pubDate)}</Text>
        <View style={[styles.rssBadge, { backgroundColor: C.purpleDim }]}>
          <Text style={[styles.rssBadgeText, { color: C.purple }]}>RSS</Text>
        </View>
      </View>

      {/* Content row */}
      <View style={styles.body}>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={3}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.desc, { color: C.textMuted }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        {item.image && (
          <Image source={{ uri: item.image }} style={styles.thumb} resizeMode="cover" />
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: C.border }]}>
        <Ionicons name="open-outline" size={13} color={C.cyan} />
        <Text style={[styles.readMore, { color: C.cyan }]}>Read full article</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 14, marginBottom: 12,
  },
  source: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 10,
  },
  favicon:        { width: 18, height: 18, borderRadius: 4 },
  faviconFallback:{ width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  feedTitle:      { flex: 1, fontSize: 12, fontWeight: '600' },
  pubDate:        { fontSize: 11 },
  rssBadge:       { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  rssBadgeText:   { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  body:           { flexDirection: 'row', gap: 10, marginBottom: 10 },
  textBlock:      { flex: 1, gap: 4 },
  title:          { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  desc:           { fontSize: 12, lineHeight: 17 },
  thumb:          { width: 80, height: 80, borderRadius: 10 },
  footer:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  readMore:       { fontSize: 12, fontWeight: '600' },
});
