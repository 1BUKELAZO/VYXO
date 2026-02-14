
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAdmin } from '@/hooks/useAdmin';
import Toast from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';

interface AdminReport {
  id: string;
  reporter_id: string;
  reporter_username: string;
  target_id: string;
  target_type: 'video' | 'user' | 'comment';
  target_username?: string;
  target_caption?: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

export default function AdminReportsScreen() {
  const { fetchReports, dismissReport, removeReportedContent, banReportedUser } = useAdmin();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'dismiss' | 'remove' | 'ban'>('dismiss');

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    console.log('Showing toast:', message, type);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadReports = useCallback(async (status: string, pageNum: number = 1, append: boolean = false) => {
    console.log('Loading reports...', { status, pageNum, append });
    try {
      if (!append) {
        setIsLoading(true);
      }
      const response = await fetchReports(status, pageNum, 20);
      const newReports = response.reports || [];
      const totalCount = response.total || 0;

      if (append) {
        setReports((prev) => [...prev, ...newReports]);
      } else {
        setReports(newReports);
      }

      setTotal(totalCount);
      setHasMore(newReports.length === 20);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      showToast(err.message || 'Failed to load reports', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fetchReports]);

  useEffect(() => {
    loadReports(statusFilter, 1, false);
  }, [statusFilter]);

  const handleRefresh = () => {
    console.log('Refreshing reports...');
    setRefreshing(true);
    loadReports(statusFilter, 1, false);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      console.log('Loading more reports...');
      loadReports(statusFilter, page + 1, true);
    }
  };

  const handleAction = async () => {
    if (!selectedReport) {
      return;
    }

    console.log('Handling report action...', actionType, selectedReport.id);
    try {
      if (actionType === 'dismiss') {
        await dismissReport(selectedReport.id);
        showToast('Report dismissed', 'success');
      } else if (actionType === 'remove') {
        await removeReportedContent(selectedReport.id);
        showToast('Content removed', 'success');
      } else if (actionType === 'ban') {
        await banReportedUser(selectedReport.id);
        showToast('User banned', 'success');
      }
      setActionModalVisible(false);
      setSelectedReport(null);
      loadReports(statusFilter, 1, false);
    } catch (err: any) {
      console.error('Failed to handle report action:', err);
      showToast(err.message || 'Failed to perform action', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const renderReport = ({ item }: { item: AdminReport }) => {
    const reportedDate = formatDate(item.created_at);

    return (
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(item.target_type) }]}>
            <Text style={styles.typeBadgeText}>{item.target_type.toUpperCase()}</Text>
          </View>
          <Text style={styles.reportDate}>{reportedDate}</Text>
        </View>

        <View style={styles.reportContent}>
          <Text style={styles.reportReason}>{item.reason}</Text>
          {item.description && (
            <Text style={styles.reportDescription}>{item.description}</Text>
          )}
          <View style={styles.reportDetails}>
            <Text style={styles.reportDetail}>Reporter: @{item.reporter_username}</Text>
            {item.target_username && (
              <Text style={styles.reportDetail}>Target: @{item.target_username}</Text>
            )}
            {item.target_caption && (
              <Text style={styles.reportDetail} numberOfLines={1}>
                Caption: {item.target_caption}
              </Text>
            )}
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.reportActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.dismissButton]}
              onPress={() => {
                setSelectedReport(item);
                setActionType('dismiss');
                setActionModalVisible(true);
              }}
            >
              <Text style={styles.actionButtonText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => {
                setSelectedReport(item);
                setActionType('remove');
                setActionModalVisible(true);
              }}
            >
              <Text style={styles.actionButtonText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.banButton]}
              onPress={() => {
                setSelectedReport(item);
                setActionType('ban');
                setActionModalVisible(true);
              }}
            >
              <Text style={styles.actionButtonText}>Ban User</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status !== 'pending' && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
          </View>
        )}
      </View>
    );
  };

  const getTypeBadgeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      video: '#8B5CF6',
      user: '#FF6B6B',
      comment: '#00D9FF',
    };
    return typeColors[type] || '#666';
  };

  const getStatusBadgeColor = (status: string) => {
    const statusColors: Record<string, string> = {
      resolved: '#10B981',
      dismissed: '#666',
    };
    return statusColors[status] || '#666';
  };

  const getActionModalTitle = () => {
    const titles: Record<string, string> = {
      dismiss: 'Dismiss Report',
      remove: 'Remove Content',
      ban: 'Ban User',
    };
    return titles[actionType] || 'Confirm Action';
  };

  const getActionModalMessage = () => {
    const messages: Record<string, string> = {
      dismiss: 'Are you sure you want to dismiss this report? No action will be taken.',
      remove: 'Are you sure you want to remove the reported content? This action cannot be undone.',
      ban: 'Are you sure you want to ban the reported user? This will prevent them from accessing the platform.',
    };
    return messages[actionType] || 'Are you sure?';
  };

  const totalDisplay = total.toLocaleString();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Manage Reports',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="arrow-back"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === 'pending' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('pending')}
        >
          <Text style={[styles.filterButtonText, statusFilter === 'pending' && styles.filterButtonTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === 'resolved' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('resolved')}
        >
          <Text style={[styles.filterButtonText, statusFilter === 'resolved' && styles.filterButtonTextActive]}>
            Resolved
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === 'dismissed' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('dismissed')}
        >
          <Text style={[styles.filterButtonText, statusFilter === 'dismissed' && styles.filterButtonTextActive]}>
            Dismissed
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.headerText}>Total Reports: {totalDisplay}</Text>
      </View>

      {isLoading && reports.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && reports.length > 0 ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      <Modal
        visible={actionModalVisible}
        onClose={() => {
          setActionModalVisible(false);
          setSelectedReport(null);
        }}
        title={getActionModalTitle()}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>{getActionModalMessage()}</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                setActionModalVisible(false);
                setSelectedReport(null);
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={handleAction}
            >
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  reportCard: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  reportDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reportContent: {
    marginBottom: 12,
  },
  reportReason: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  reportDetails: {
    gap: 4,
  },
  reportDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: '#666',
  },
  removeButton: {
    backgroundColor: '#FF6B6B',
  },
  banButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  footerLoader: {
    marginVertical: 16,
  },
  modalContent: {
    gap: 16,
  },
  modalText: {
    fontSize: 16,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#333',
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
