
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Href } from 'expo-router';

export interface TabBarItem {
  name: string;
  route: Href;
  title: string;
  ios_icon_name: string;
  android_material_icon_name: string;
  isCenter?: boolean;
  showBadge?: boolean;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
}

export default function FloatingTabBar({ tabs }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const activeTabIndex = React.useMemo(() => {
    let bestMatch = -1;
    let bestMatchScore = 0;

    tabs.forEach((tab, index) => {
      let score = 0;

      if (pathname === tab.route) {
        score = 100;
      } else if (pathname.startsWith(tab.route as string)) {
        score = 80;
      } else if (pathname.includes(tab.name.toLowerCase())) {
        score = 60;
      }

      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = index;
      }
    });

    return bestMatch >= 0 ? bestMatch : 0;
  }, [pathname, tabs]);

  const handleTabPress = (route: Href) => {
    router.push(route);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.tabBar}>
          {tabs.map((tab, index) => {
            const isActive = activeTabIndex === index;
            const isCenter = tab.isCenter;

            return (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={[styles.tab, isCenter && styles.centerTab]}
                  onPress={() => handleTabPress(tab.route)}
                  activeOpacity={0.7}
                >
                  {isCenter ? (
                    <View style={styles.centerIconContainer}>
                      <View style={styles.centerIconInner}>
                        <IconSymbol
                          android_material_icon_name={tab.android_material_icon_name}
                          ios_icon_name={tab.ios_icon_name}
                          size={32}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.tabContent}>
                      <View style={styles.iconWrapper}>
                        <IconSymbol
                          android_material_icon_name={tab.android_material_icon_name}
                          ios_icon_name={tab.ios_icon_name}
                          size={26}
                          color={isActive ? colors.primary : '#666666'}
                        />
                        {tab.showBadge && (
                          <View style={styles.badge} />
                        )}
                      </View>
                      {tab.title && (
                        <Text
                          style={[
                            styles.tabLabel,
                            isActive && styles.tabLabelActive,
                          ]}
                        >
                          {tab.title}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#0F0F0F',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  container: {
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    backgroundColor: '#0F0F0F',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  centerTab: {
    flex: 0,
    paddingHorizontal: 16,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    borderWidth: 1,
    borderColor: '#0F0F0F',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666666',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  centerIconContainer: {
    width: 56,
    height: 40,
    position: 'relative',
  },
  centerIconInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
