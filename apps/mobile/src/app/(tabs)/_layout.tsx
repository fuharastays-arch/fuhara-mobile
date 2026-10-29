import { Tabs } from 'expo-router';
import { Heart, House, Luggage, Search, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

const tabIcon = (Icon: typeof House, color: string, focused: boolean) => (
  <Icon
    size={23}
    color={color}
    strokeWidth={focused ? 2.4 : 2}
    fill={Icon === Heart && focused ? colors.softTeal : 'transparent'}
  />
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tealDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: true,
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 15,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 7 },
        tabBarStyle: {
          height: 61 + bottom,
          paddingBottom: bottom,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(House, String(color), focused),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(Search, String(color), focused),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(Luggage, String(color), focused),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(Heart, String(color), focused),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(UserRound, String(color), focused),
        }}
      />
      <Tabs.Screen name="host" options={{ href: null }} />
    </Tabs>
  );
}
