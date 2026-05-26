import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const EMOJI_CATEGORIES = {
  '😀': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  '👋': ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫'],
  '🎉': ['🎉','🎊','🎈','🎁','🎀','🎗','🎟','🎫','🎖','🏆','🥇','🥈','🥉','🏅','🎪','🤹','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🎲','♟','🎯','🎳','🎮','🎰','🧩'],
  '🔥': ['🔥','💥','✨','🌟','⭐','🌠','🌌','🌈','☀️','🌤','⛅','🌥','☁️','🌦','🌧','⛈','🌩','🌨','❄️','☃️','⛄','🌬','💨','🌪','🌫','🌊','💧','💦','☔','⚡','🌀','🌈'],
};

type Props = {
  onSelect: (emoji: string) => void;
};

export default function EmojiPicker({ onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState('😀');

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.trigger}>
        <Text style={styles.triggerEmoji}>😊</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.picker} onStartShouldSetResponder={() => true}>
            {/* Category tabs */}
            <View style={styles.categories}>
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, activeCategory === cat && styles.catBtnActive]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={styles.catEmoji}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Emoji grid */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.grid}>
              <View style={styles.emojiGrid}>
                {(EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES] || []).map((emoji, i) => (
                  <TouchableOpacity key={i} style={styles.emojiBtn} onPress={() => handleSelect(emoji)}>
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { padding: 4 },
  triggerEmoji: { fontSize: 22 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  picker: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
    height: 320,
  },
  categories: {
    flexDirection: 'row', paddingHorizontal: 12,
    paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: Colors.border, gap: 4,
  },
  catBtn: {
    width: 40, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  catBtnActive: { backgroundColor: Colors.purpleDim },
  catEmoji: { fontSize: 20 },
  grid: { flex: 1, padding: 8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  emojiBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  emoji: { fontSize: 26 },
});
