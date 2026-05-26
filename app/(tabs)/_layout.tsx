import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useNotificationStore } from '@/store/notificationStore';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused, C }: { name: IconName; focused: boolean; C: any }) {
  if (focused) {
    return (
      <LinearGradient
        colors={[C.purple, C.cyan]}
        style={styles.activeIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={name} size={19} color="#fff" />
      </LinearGradient>
    );
  }
  return <Ionicons name={name} size={22} color={C.textMuted} />;
}

function BadgeIcon({ name, focused, count, C }: { name: IconName; focused: boolean; count: number; C: any }) {
  return (
    <View style={styles.badgeWrap}>
      <TabIcon name={name} focused={focused} C={C} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: C.error, borderColor: C.bgCard }]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const unreadMessages      = useNotificationStore((s) => s.unreadMessages);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);

  // Tab bar height: base 60px + safe area bottom inset
  const tabBarHeight = 60 + (insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.bgCard,
          borderTopWidth: 0,           // remove the border line
          elevation: 0,                // remove Android shadow
          shadowOpacity: 0,            // remove iOS shadow
          height: tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 8 : 6,
          paddingTop: 8,
          // Subtle top separator via a thin gradient-like shadow
          shadowColor: C.purple,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 12,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} C={C} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} C={C} />
          ),
        }}
      />

      <Tabs.Screen
        name="post"
        options={{
          tabBarIcon: ({ focused }) => (
            <LinearGradient
              colors={[C.purple, C.cyan]}
              style={styles.postBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </LinearGradient>
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <BadgeIcon
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              focused={focused}
              count={unreadMessages}
              C={C}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            useNotificationStore.getState().resetUnreadMessages();
          },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <BadgeIcon
              name={focused ? 'person' : 'person-outline'}
              focused={focused}
              count={unreadNotifications}
              C={C}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  postBtn: {
    width: 52, height: 52, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    // Glow effect
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  badgeWrap: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 0, right: 0,
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
