import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, Pressable, Image, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { generatePostContent, improvePostContent, generateImage } from '@/lib/gemini';
import { uploadImageFromWeb } from '@/lib/cloudinary';
import { toast } from '@/lib/toast';

type Props = {
  visible: boolean;
  onClose: () => void;
  currentText: string;
  onApplyText: (text: string) => void;
  onApplyImage: (localUri: string, cloudUrl: string) => void;
};

type AiMode = 'write' | 'improve' | 'image';

export default function AiPostPanel({ visible, onClose, currentText, onApplyText, onApplyImage }: Props) {
  const C = useColors();
  const [mode, setMode]         = useState<AiMode>('write');
  const [prompt, setPrompt]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<string | null>(null);   // text result
  const [imgUri, setImgUri]     = useState<string | null>(null);   // base64 data URI
  const [uploading, setUploading] = useState(false);

  const handleGenerate = async () => {
    const input = mode === 'improve' ? currentText : prompt;
    if (!input.trim()) return toast.warning(mode === 'improve' ? 'Write something first to improve.' : 'Enter a prompt.');
    setLoading(true);
    setResult(null);
    setImgUri(null);
    try {
      if (mode === 'write') {
        const text = await generatePostContent(input);
        setResult(text);
      } else if (mode === 'improve') {
        const text = await improvePostContent(input);
        setResult(text);
      } else {
        const uri = await generateImage(input);
        setImgUri(uri);
      }
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyText = () => {
    if (!result) return;
    onApplyText(result);
    setResult(null);
    setPrompt('');
    onClose();
    toast.success('AI text applied!');
  };

  const handleApplyImage = async () => {
    if (!imgUri) return;
    setUploading(true);
    try {
      // Convert base64 data URI to blob and upload to Cloudinary
      const res = await fetch(imgUri);
      const blob = await res.blob();
      const file = new File([blob], 'ai-generated.png', { type: 'image/png' });
      const { url } = await uploadImageFromWeb(file, 'linkerx/ai');
      onApplyImage(imgUri, url);
      setImgUri(null);
      setPrompt('');
      onClose();
      toast.success('AI image applied!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const modes: { key: AiMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; desc: string }[] = [
    { key: 'write',   label: 'Write',   icon: 'create-outline',    desc: 'Generate post from idea' },
    { key: 'improve', label: 'Improve', icon: 'sparkles-outline',  desc: 'Enhance your current text' },
    { key: 'image',   label: 'Image',   icon: 'image-outline',     desc: 'Generate AI image' },
  ];

  const handleClose = () => {
    setPrompt('');
    setResult(null);
    setImgUri(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.sheet, { backgroundColor: C.bgCard, borderColor: C.border }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <LinearGradient colors={['#4F46E5', '#7C3AED', '#06B6D4']} style={styles.headerIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Gemini AI</Text>
              <Text style={[styles.headerSub, { color: C.textMuted }]}>Powered by Google</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: C.bgElevated }]}>
              <Ionicons name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Mode selector */}
            <View style={styles.modeRow}>
              {modes.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.modeBtn, { backgroundColor: C.bgElevated, borderColor: mode === m.key ? C.purple : C.border }]}
                  onPress={() => { setMode(m.key); setResult(null); setImgUri(null); }}
                >
                  {mode === m.key ? (
                    <LinearGradient colors={[C.purple, C.cyan]} style={styles.modeBtnActive}>
                      <Ionicons name={m.icon} size={16} color="#fff" />
                      <Text style={[styles.modeLabelActive]}>{m.label}</Text>
                    </LinearGradient>
                  ) : (
                    <>
                      <Ionicons name={m.icon} size={16} color={C.textMuted} />
                      <Text style={[styles.modeLabel, { color: C.textMuted }]}>{m.label}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Mode description */}
            <Text style={[styles.modeDesc, { color: C.textMuted }]}>
              {modes.find((m) => m.key === mode)?.desc}
            </Text>

            {/* Prompt input — not shown for "improve" */}
            {mode !== 'improve' && (
              <View style={[styles.promptWrap, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
                <TextInput
                  style={[styles.promptInput, { color: C.textPrimary }]}
                  placeholder={mode === 'write' ? 'e.g. "Excited about my new project launch"' : 'e.g. "A futuristic city at sunset, digital art"'}
                  placeholderTextColor={C.textMuted}
                  value={prompt}
                  onChangeText={setPrompt}
                  multiline
                  maxLength={300}
                />
              </View>
            )}

            {/* Improve mode — shows current text preview */}
            {mode === 'improve' && (
              <View style={[styles.improvePreview, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
                <Text style={[styles.improveLabel, { color: C.textMuted }]}>Current text:</Text>
                <Text style={[styles.improveText, { color: C.textSecondary }]} numberOfLines={4}>
                  {currentText || '(empty — write something first)'}
                </Text>
              </View>
            )}

            {/* Generate button */}
            <TouchableOpacity onPress={handleGenerate} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={['#4F46E5', '#7C3AED', '#06B6D4']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.generateBtn}
              >
                {loading
                  ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.generateBtnText}>Generating...</Text></>
                  : <><Ionicons name="sparkles" size={16} color="#fff" /><Text style={styles.generateBtnText}>Generate</Text></>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Text result */}
            {result && (
              <View style={[styles.resultCard, { backgroundColor: C.bgElevated, borderColor: C.purple + '44' }]}>
                <View style={styles.resultHeader}>
                  <Ionicons name="sparkles" size={14} color={C.purple} />
                  <Text style={[styles.resultLabel, { color: C.purple }]}>AI Generated</Text>
                </View>
                <Text style={[styles.resultText, { color: C.textPrimary }]}>{result}</Text>
                <TouchableOpacity onPress={handleApplyText} style={styles.applyBtnWrap}>
                  <LinearGradient colors={[C.purple, C.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyBtn}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.applyBtnText}>Use This</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Image result */}
            {imgUri && (
              <View style={[styles.imgResultCard, { borderColor: C.purple + '44' }]}>
                <Image source={{ uri: imgUri }} style={styles.generatedImg} resizeMode="cover" />
                <View style={[styles.imgResultFooter, { backgroundColor: C.bgCard }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.imgResultLabel, { color: C.textPrimary }]}>AI Generated Image</Text>
                    <Text style={[styles.imgResultSub, { color: C.textMuted }]}>Tap to use in your post</Text>
                  </View>
                  <TouchableOpacity onPress={handleApplyImage} disabled={uploading} style={styles.applyBtnWrap}>
                    <LinearGradient colors={[C.purple, C.cyan]} style={styles.applyBtn}>
                      {uploading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={styles.applyBtnText}>Use</Text></>
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, maxHeight: '88%' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerIcon:   { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '700' },
  headerSub:    { fontSize: 11, marginTop: 1 },
  closeBtn:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body:         { padding: 16, gap: 12, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modeRow:      { flexDirection: 'row', gap: 8 },
  modeBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, paddingVertical: 10, borderWidth: 1, overflow: 'hidden' },
  modeBtnActive:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10 },
  modeLabel:    { fontSize: 12, fontWeight: '500' },
  modeLabelActive: { fontSize: 12, fontWeight: '700', color: '#fff' },
  modeDesc:     { fontSize: 12, marginTop: -4 },
  promptWrap:   { borderRadius: 14, borderWidth: 1, padding: 12, minHeight: 80 },
  promptInput:  { fontSize: 14, lineHeight: 20 },
  improvePreview: { borderRadius: 14, borderWidth: 1, padding: 12 },
  improveLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  improveText:  { fontSize: 13, lineHeight: 20 },
  generateBtn:  { height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resultCard:   { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  resultText:   { fontSize: 14, lineHeight: 22 },
  applyBtnWrap: { alignSelf: 'flex-end' },
  applyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  imgResultCard:{ borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  generatedImg: { width: '100%', height: 220 },
  imgResultFooter: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  imgResultLabel: { fontSize: 13, fontWeight: '600' },
  imgResultSub:   { fontSize: 11, marginTop: 2 },
});
