
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Users', path: '/admin/users', icon: 'person' },
    { label: 'Videos', path: '/admin/videos', icon: 'movie' },
    { label: 'Reports', path: '/admin/reports', icon: 'warning' },
  ];

  const handleNavigate = (path: string) => {
    console.log('Admin sidebar navigating to:', path);
    router.push(path as any);
    if (onClose) {
      onClose();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>VYXO</Text>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => handleNavigate(item.path)}
            >
              <IconSymbol
                ios_icon_name={item.icon}
                android_material_icon_name={item.icon}
                size={24}
                color={isActive ? colors.primary : colors.text}
              />
              <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
        <IconSymbol
          ios_icon_name="arrow-back"
          android_material_icon_name="arrow-back"
          size={20}
          color={colors.text}
        />
        <Text style={styles.backButtonText}>Back to App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  menu: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
  },
  menuItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  backButtonText: {
    fontSize: 14,
    color: colors.text,
  },
});
