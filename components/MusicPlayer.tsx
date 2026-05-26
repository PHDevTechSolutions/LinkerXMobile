import React, { useRef, useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusicStore } from '@/store/musicStore';
import { useColors } from '@/hooks/useColors';

// WebView is only used on native — on web we use a plain <iframe>
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

/**
 * Builds the YouTube embed HTML page that auto-plays and responds to
 * postMessage commands (play / pause).
 */
function buildEmbedHtml(videoId: string, autoplay: boolean) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin:0; padding:0; box-sizing:border-box; background:#000; }
  iframe { width:100%; height:100%; border:none; }
</style>
</head>
<body>
<iframe
  id="yt"
  src="https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1"
  allow="autoplay; encrypted-media"
  allowfullscreen
></iframe>
<script>
  // Listen for play/pause commands from React Native
  document.addEventListener('message', function(e) {
    var iframe = document.getElementById('yt');
    var cmd = e.data;
    if (cmd === 'play')  iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    if (cmd === 'pause') iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  });
  window.addEventListener('message', function(e) {
    var iframe = document.getElementById('yt');
    var cmd = e.data;
    if (cmd === 'play')  iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    if (cmd === 'pause') iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  });
</script>
</body>
</html>`;
}

/**
 * GlobalMusicPlayer — rendered once in app/_layout.tsx so it persists
 * across all tab navigations.
 *
 * Web:    renders a hidden <iframe> embed (no extra package needed)
 * Native: renders a react-native-webview (installed via expo)
 */
export default function GlobalMusicPlayer() {
  const C = useColors();
  const { currentTrack, isPlaying, isVisible, isMinimized, togglePlay, closePlayer, toggleMinimize } =
    useMusicStore();
  const webViewRef = useRef<any>(null);
  const [videoExpanded, setVideoExpanded] = useState(false);

  // Send play/pause command into the WebView
  const sendCommand = useCallback((cmd: 'play' | 'pause') => {
    if (Platform.OS !== 'web' && webViewRef.current) {
      webViewRef.current.postMessage(cmd);
    }
    // On web the iframe handles autoplay via src param change
  }, []);

  const handleTogglePlay = useCallback(() => {
    sendCommand(isPlaying ? 'pause' : 'play');
    togglePlay();
  }, [isPlaying, togglePlay, sendCommand]);

  if (!isVisible || !currentTrack) return null;

  // ── Web: use a hidden iframe ──────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: C.bgCard, borderColor: C.border }]}>
        {/* Actual YouTube iframe — always mounted so audio keeps playing */}
        <View style={videoExpanded ? styles.videoExpanded : styles.videoHidden}>
          <iframe
            src={`https://www.youtube.com/embed/${currentTrack.videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media"
            style={{ width: '100%', height: '100%', border: 'none' } as any}
            title={currentTrack.title}
          />
        </View>

        {/* Control bar */}
        <LinearGradient colors={[C.purple + '22', C.bgCard]} style={styles.controlBar}>
          <Image source={{ uri: currentTrack.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: C.textPrimary }]} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={[styles.channelTitle, { color: C.textMuted }]} numberOfLines={1}>
              {currentTrack.channelTitle}
            </Text>
          </View>
          <View style={styles.controls}>
            <TouchableOpacity onPress={() => setVideoExpanded((v) => !v)} style={styles.controlBtn}>
              <Ionicons name={videoExpanded ? 'chevron-down' : 'chevron-up'} size={18} color={C.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={closePlayer} style={styles.controlBtn}>
              <Ionicons name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ── Native: use react-native-webview ─────────────────────────────────────
  const embedHtml = buildEmbedHtml(currentTrack.videoId, isPlaying);

  return (
    <View style={[styles.container, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      {/* WebView is always mounted (height 1 when minimized) so audio keeps playing */}
      <View style={isMinimized ? styles.videoHidden : styles.videoNative}>
        <WebView
          ref={webViewRef}
          source={{ html: embedHtml }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          style={{ flex: 1, backgroundColor: '#000' }}
        />
      </View>

      {/* Control bar */}
      <LinearGradient colors={[C.purple + '22', C.bgCard]} style={styles.controlBar}>
        <Image source={{ uri: currentTrack.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: C.textPrimary }]} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={[styles.channelTitle, { color: C.textMuted }]} numberOfLines={1}>
            {currentTrack.channelTitle}
          </Text>
        </View>
        <View style={styles.controls}>
          {/* Expand/collapse video */}
          <TouchableOpacity onPress={toggleMinimize} style={styles.controlBtn}>
            <Ionicons name={isMinimized ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity onPress={handleTogglePlay} style={styles.playBtn}>
            <LinearGradient
              colors={[C.purple, C.cyan]}
              style={styles.playBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={C.white} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Close */}
          <TouchableOpacity onPress={closePlayer} style={styles.controlBtn}>
            <Ionicons name="close" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 999,
  },
  videoHidden: {
    height: 1,
    overflow: 'hidden',
  },
  videoExpanded: {
    height: 200,
  },
  videoNative: {
    height: 200,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  channelTitle: {
    fontSize: 11,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  playBtnGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
