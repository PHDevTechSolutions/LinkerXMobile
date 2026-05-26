import { Tabs, router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useNotificationStore } from '@/store/notificationStore';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  if (focused) {
    return (
      <LinearGradient
        colors={[Colors.purple, Colors.cyan]}
        style={styles.activeIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={name} size={20} color={Colors.white} />
      </LinearGradient>
    );
  }
  return <Ionicons name={name} size={22} color={Colors.textMuted} />;
}

// Badge dot/count overlay
function BadgeIcon({
  name, focused, count,
}: { name: IconName; focused: boolean; count: number }) {
  return (
    <View style={styles.badgeWrap}>
      <TabIcon name={name} focused={focused} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const unreadMessages      = useNotificationStore((s) => s.unreadMessages);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.purple,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          tabBarIcon: ({ focused }) => (
            <LinearGradient
              colors={[Colors.purple, Colors.cyan]}
              style={styles.postBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={26} color={Colors.white} />
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
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            // Reset chat badge when user opens chat tab
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
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 70,
    paddingBottom: 10,
    paddingTop: 8,
  },
  activeIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  postBtn: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  badgeWrap: { position: 'relative' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Colors.error,
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: Colors.bgCard,
  },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: '800' },
});
