import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

const VERSION = '1.0.0';
const BUILD   = '2026.05';

const FEATURES = [
  { icon: 'newspaper-outline'    as const, label: 'Social Feed',         desc: 'Posts, reactions, comments & stories' },
  { icon: 'chatbubbles-outline'  as const, label: 'Real-time Chat',      desc: 'DMs, groups, file sharing & calls' },
  { icon: 'logo-youtube'         as const, label: 'YouTube Integration', desc: 'Music player & video posts' },
  { icon: 'link-outline'         as const, label: 'Link-in-Bio',         desc: 'Your personal public page' },
  { icon: 'search-outline'       as const, label: 'Explore',             desc: 'Discover and follow people' },
  { icon: 'videocam-outline'     as const, label: 'Video Calls',         desc: 'WebRTC-powered HD calls' },
];

const LINKS = [
  { icon: 'globe-outline'  as const, label: 'Website',       url: 'https://linkerxmobile-production.up.railway.app' },
  { icon: 'logo-github'    as const, label: 'GitHub',        url: 'https://github.com/PHDevTechSolutions' },
  { icon: 'mail-outline'   as const, label: 'Contact',       url: 'mailto:support@linkerx.app' },
];

export default function AboutScreen() {
  const C = useColors();

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>About LinkerX</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* App identity */}
        <View style={styles.identity}>
          <LinearGradient colors={[C.purple, C.cyan]} style={styles.appIcon}>
            <Ionicons name="link" size={40} color="#fff" />
          </LinearGradient>
          <Text style={[styles.appName, { color: C.textPrimary }]}>LinkerX</Text>
          <Text style={[styles.appTagline, { color: C.textMuted }]}>Connect. Share. Link.</Text>
          <View style={[styles.versionBadge, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Text style={[styles.versionText, { color: C.textMuted }]}>Version {VERSION} · Build {BUILD}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={[styles.descCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[styles.descText, { color: C.textSecondary }]}>
            LinkerX is a social platform built for creators, developers, and communities. Share links, posts, and media — all in one place. Your bio page acts as your personal hub, while the integrated YouTube player keeps your music going across every screen.
          </Text>
        </View>

        {/* Features */}
        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>FEATURES</Text>
        <View style={[styles.featuresCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          {FEATURES.map((f, i) => (
            <React.Fragment key={f.label}>
              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: C.purpleDim }]}>
                  <Ionicons name={f.icon} size={18} color={C.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureLabel, { color: C.textPrimary }]}>{f.label}</Text>
                  <Text style={[styles.featureDesc, { color: C.textMuted }]}>{f.desc}</Text>
                </View>
              </View>
              {i < FEATURES.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Tech stack */}
        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>BUILT WITH</Text>
        <View style={[styles.techCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          {[
            { name: 'React Native + Expo', color: '#61DAFB' },
            { name: 'Expo Router',         color: C.purple },
            { name: 'Node.js + Express',   color: '#68A063' },
            { name: 'MongoDB',             color: '#47A248' },
            { name: 'Socket.IO',           color: C.cyan },
            { name: 'Cloudinary',          color: '#3448C5' },
            { name: 'YouTube Data API v3', color: '#FF0000' },
            { name: 'WebRTC',              color: C.success },
          ].map((tech) => (
            <View key={tech.name} style={[styles.techChip, { backgroundColor: tech.color + '22', borderColor: tech.color + '44' }]}>
              <Text style={[styles.techChipText, { color: tech.color }]}>{tech.name}</Text>
            </View>
          ))}
        </View>

        {/* Links */}
        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>LINKS</Text>
        {LINKS.map((link) => (
          <TouchableOpacity
            key={link.label}
            style={[styles.linkItem, { backgroundColor: C.bgCard, borderColor: C.border }]}
            onPress={() => Linking.openURL(link.url)}
          >
            <View style={[styles.linkIcon, { backgroundColor: C.purpleDim }]}>
              <Ionicons name={link.icon} size={18} color={C.purple} />
            </View>
            <Text style={[styles.linkLabel, { color: C.textPrimary }]}>{link.label}</Text>
            <Ionicons name="open-outline" size={16} color={C.cyan} />
          </TouchableOpacity>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <LinearGradient colors={[C.purple, C.cyan]} style={styles.footerDot} />
          <Text style={[styles.footerText, { color: C.textMuted }]}>
            © 2026 LinkerX · Made with ❤️ by PHDevTechSolutions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700' },
  content:      { padding: 16, paddingBottom: 48, gap: 12 },

  identity:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  appIcon:      { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  appName:      { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  appTagline:   { fontSize: 14 },
  versionBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  versionText:  { fontSize: 12 },

  descCard:     { borderRadius: 16, borderWidth: 1, padding: 16 },
  descText:     { fontSize: 14, lineHeight: 22 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginLeft: 2, marginTop: 4 },

  featuresCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 2 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  featureIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 14, fontWeight: '600' },
  featureDesc:  { fontSize: 12, marginTop: 1 },
  divider:      { height: 1 },

  techCard:     { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  techChip:     { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  techChipText: { fontSize: 12, fontWeight: '600' },

  linkItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  linkIcon:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkLabel:    { flex: 1, fontSize: 14, fontWeight: '600' },

  footer:       { alignItems: 'center', gap: 8, marginTop: 8 },
  footerDot:    { width: 32, height: 4, borderRadius: 2 },
  footerText:   { fontSize: 12, textAlign: 'center' },
});
