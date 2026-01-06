import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  LayoutDashboard, 
  BarChart3,
  Activity,
  Package,
  Users,
  Truck,
  ChevronDown,
  ChevronRight,
  Database,
  Calendar,
  X
} from 'lucide-react-native';

export type FilterLevel = 'ALL' | 'PV_AREA' | 'PV_AREA_BLOCK' | 'SUPERVISOR';
export type ViewType = 'TASKS_PROGRESS' | 'ACTIVITY_PROGRESS' | 'BOQ_PROGRESS';
export type TimeRangeType = 'ALL_TIME' | 'CURRENT_WEEK' | 'CUSTOM_WEEK' | 'MONTHLY';
export type DashboardSection = 'PROGRESS' | 'BOQ' | 'PLANT' | 'STAFF' | 'LOGISTICS';

interface FilterState {
  level: FilterLevel;
  pvAreaId?: string;
  blockAreaId?: string;
  supervisorId?: string;
}

interface Props {
  onFilterChange: (filter: FilterState) => void;
  onViewChange: (viewType: ViewType) => void;
  onSectionChange: (section: DashboardSection) => void;
  onTimeRangeChange: (timeRange: TimeRangeType, customDate?: Date, monthYear?: { month: number; year: number }) => void;
  currentSection: DashboardSection;
  currentView: ViewType;
  currentFilter: FilterState;
  currentTimeRange: TimeRangeType;
  customWeekDate?: Date;
  selectedMonthYear?: { month: number; year: number };
  pvAreas: { id: string; name: string }[];
  blockAreas: { id: string; name: string; pvAreaId: string }[];
  supervisors: { id: string; name: string; role: string }[];
}

export default function DashboardFilterSidebar({
  onFilterChange,
  onViewChange,
  onSectionChange,
  onTimeRangeChange,
  currentSection,
  currentView,
  currentFilter,
  currentTimeRange,
  customWeekDate,
  selectedMonthYear,
  pvAreas,
  blockAreas,
  supervisors,
}: Props) {
  const [expandedProgress, setExpandedProgress] = useState(true);
  const [expandedViews, setExpandedViews] = useState(false);
  const [expandedTimeRange, setExpandedTimeRange] = useState(true);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tempWeekDate, setTempWeekDate] = useState(new Date());
  const [tempMonthDate, setTempMonthDate] = useState(new Date());
  
  const supervisorUsers = supervisors.filter(s => s.role === 'Supervisor');

  const handleLevelChange = (level: FilterLevel) => {
    if (level === 'ALL') {
      onFilterChange({ level: 'ALL' });
    } else if (level === 'PV_AREA') {
      onFilterChange({ level: 'PV_AREA', pvAreaId: undefined, blockAreaId: undefined });
    } else if (level === 'PV_AREA_BLOCK') {
      onFilterChange({ level: 'PV_AREA_BLOCK', pvAreaId: undefined, blockAreaId: undefined });
    } else if (level === 'SUPERVISOR') {
      onFilterChange({ level: 'SUPERVISOR', supervisorId: undefined });
    }
  };

  const handlePvAreaSelect = (pvAreaId: string) => {
    if (currentFilter.level === 'PV_AREA') {
      onFilterChange({ level: 'PV_AREA', pvAreaId });
    } else if (currentFilter.level === 'PV_AREA_BLOCK') {
      onFilterChange({ level: 'PV_AREA_BLOCK', pvAreaId, blockAreaId: undefined });
    }
  };

  const handleBlockAreaSelect = (blockAreaId: string) => {
    onFilterChange({ 
      level: 'PV_AREA_BLOCK', 
      pvAreaId: currentFilter.pvAreaId,
      blockAreaId
    });
  };

  const handleSupervisorSelect = (supervisorId: string) => {
    onFilterChange({
      ...currentFilter,
      supervisorId: currentFilter.supervisorId === supervisorId ? undefined : supervisorId,
    });
  };

  const filteredBlockAreas = currentFilter.pvAreaId
    ? blockAreas.filter(b => b.pvAreaId === currentFilter.pvAreaId)
    : blockAreas;

  const handleWeekDateConfirm = () => {
    onTimeRangeChange('CUSTOM_WEEK', tempWeekDate);
    setShowWeekPicker(false);
  };

  const handleMonthDateConfirm = () => {
    const month = tempMonthDate.getMonth() + 1;
    const year = tempMonthDate.getFullYear();
    onTimeRangeChange('MONTHLY', undefined, { month, year });
    setShowMonthPicker(false);
  };

  const handleWeekPickerOpen = () => {
    setTempWeekDate(customWeekDate || new Date());
    setShowWeekPicker(true);
  };

  const handleMonthPickerOpen = () => {
    if (selectedMonthYear) {
      const date = new Date(selectedMonthYear.year, selectedMonthYear.month - 1, 1);
      setTempMonthDate(date);
    } else {
      setTempMonthDate(new Date());
    }
    setShowMonthPicker(true);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <LayoutDashboard size={24} color="#4285F4" strokeWidth={2.5} />
        </View>
        <Text style={styles.logoText}>Dashboard</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SECTIONS</Text>
          
          <TouchableOpacity
            style={[styles.sectionItem, currentSection === 'PROGRESS' && styles.sectionItemActive]}
            onPress={() => {
              if (currentSection === 'PROGRESS') {
                setExpandedProgress(!expandedProgress);
              } else {
                onSectionChange('PROGRESS');
                setExpandedProgress(true);
              }
            }}
            activeOpacity={0.7}
          >
            <BarChart3 
              size={20} 
              color={currentSection === 'PROGRESS' ? '#4285F4' : '#5f6368'} 
              strokeWidth={currentSection === 'PROGRESS' ? 2.5 : 2}
            />
            <Text style={[
              styles.sectionItemText,
              currentSection === 'PROGRESS' && styles.sectionItemTextActive
            ]}>
              Progress
            </Text>
            {currentSection === 'PROGRESS' && (
              expandedProgress ? (
                <ChevronDown size={18} color="#4285F4" strokeWidth={2} />
              ) : (
                <ChevronRight size={18} color="#4285F4" strokeWidth={2} />
              )
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionItem, currentSection === 'BOQ' && styles.sectionItemActive]}
            onPress={() => onSectionChange('BOQ')}
            activeOpacity={0.7}
          >
            <Database 
              size={20} 
              color={currentSection === 'BOQ' ? '#4285F4' : '#5f6368'} 
              strokeWidth={currentSection === 'BOQ' ? 2.5 : 2}
            />
            <Text style={[
              styles.sectionItemText,
              currentSection === 'BOQ' && styles.sectionItemTextActive
            ]}>
              BOQ Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionItem, currentSection === 'PLANT' && styles.sectionItemActive]}
            onPress={() => onSectionChange('PLANT')}
            activeOpacity={0.7}
          >
            <Package 
              size={20} 
              color={currentSection === 'PLANT' ? '#4285F4' : '#5f6368'} 
              strokeWidth={currentSection === 'PLANT' ? 2.5 : 2}
            />
            <Text style={[
              styles.sectionItemText,
              currentSection === 'PLANT' && styles.sectionItemTextActive
            ]}>
              Plant Assets
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionItem, currentSection === 'STAFF' && styles.sectionItemActive]}
            onPress={() => onSectionChange('STAFF')}
            activeOpacity={0.7}
          >
            <Users 
              size={20} 
              color={currentSection === 'STAFF' ? '#4285F4' : '#5f6368'} 
              strokeWidth={currentSection === 'STAFF' ? 2.5 : 2}
            />
            <Text style={[
              styles.sectionItemText,
              currentSection === 'STAFF' && styles.sectionItemTextActive
            ]}>
              Staff
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionItem, currentSection === 'LOGISTICS' && styles.sectionItemActive]}
            onPress={() => onSectionChange('LOGISTICS')}
            activeOpacity={0.7}
          >
            <Truck 
              size={20} 
              color={currentSection === 'LOGISTICS' ? '#4285F4' : '#5f6368'} 
              strokeWidth={currentSection === 'LOGISTICS' ? 2.5 : 2}
            />
            <Text style={[
              styles.sectionItemText,
              currentSection === 'LOGISTICS' && styles.sectionItemTextActive
            ]}>
              Logistics
            </Text>
          </TouchableOpacity>
        </View>

        {currentSection === 'PROGRESS' && expandedProgress && (
          <>
            <View style={styles.filterOptionsInline}>
              <TouchableOpacity
                style={styles.expandableHeader}
                onPress={() => setExpandedTimeRange(!expandedTimeRange)}
                activeOpacity={0.7}
              >
                <Calendar size={16} color="#5f6368" strokeWidth={2} />
                <Text style={styles.sectionLabel}>TIME RANGE</Text>
                {expandedTimeRange ? (
                  <ChevronDown size={18} color="#5f6368" strokeWidth={2} />
                ) : (
                  <ChevronRight size={18} color="#5f6368" strokeWidth={2} />
                )}
              </TouchableOpacity>

              {expandedTimeRange && (
                <View style={styles.timeRangeOptions}>
                  <TouchableOpacity
                    style={[styles.filterOption, currentTimeRange === 'ALL_TIME' && styles.filterOptionActive]}
                    onPress={() => onTimeRangeChange('ALL_TIME')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radio, currentTimeRange === 'ALL_TIME' && styles.radioActive]}>
                      {currentTimeRange === 'ALL_TIME' && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.filterOptionText, currentTimeRange === 'ALL_TIME' && styles.filterOptionTextActive]}>
                      All Time (Overview)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterOption, currentTimeRange === 'CURRENT_WEEK' && styles.filterOptionActive]}
                    onPress={() => onTimeRangeChange('CURRENT_WEEK')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radio, currentTimeRange === 'CURRENT_WEEK' && styles.radioActive]}>
                      {currentTimeRange === 'CURRENT_WEEK' && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.filterOptionText, currentTimeRange === 'CURRENT_WEEK' && styles.filterOptionTextActive]}>
                      Current Week
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterOption, currentTimeRange === 'CUSTOM_WEEK' && styles.filterOptionActive]}
                    onPress={handleWeekPickerOpen}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radio, currentTimeRange === 'CUSTOM_WEEK' && styles.radioActive]}>
                      {currentTimeRange === 'CUSTOM_WEEK' && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.filterOptionText, currentTimeRange === 'CUSTOM_WEEK' && styles.filterOptionTextActive]}>
                      Historical Week
                    </Text>
                  </TouchableOpacity>

                  {currentTimeRange === 'CUSTOM_WEEK' && customWeekDate && (
                    <View style={styles.selectedDateContainer}>
                      <Text style={styles.selectedDateText}>
                        Week of {customWeekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.filterOption, currentTimeRange === 'MONTHLY' && styles.filterOptionActive]}
                    onPress={handleMonthPickerOpen}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radio, currentTimeRange === 'MONTHLY' && styles.radioActive]}>
                      {currentTimeRange === 'MONTHLY' && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.filterOptionText, currentTimeRange === 'MONTHLY' && styles.filterOptionTextActive]}>
                      Monthly View
                    </Text>
                  </TouchableOpacity>

                  {currentTimeRange === 'MONTHLY' && selectedMonthYear && (
                    <View style={styles.selectedDateContainer}>
                      <Text style={styles.selectedDateText}>
                        {monthNames[selectedMonthYear.month - 1]} {selectedMonthYear.year}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={[styles.filterOptionsInline, { marginTop: 12 }]}>
              <Text style={styles.filterSubLabel}>Progress View</Text>
              
              <TouchableOpacity
                style={[styles.filterOption, currentFilter.level === 'ALL' && styles.filterOptionActive]}
                onPress={() => handleLevelChange('ALL')}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, currentFilter.level === 'ALL' && styles.radioActive]}>
                  {currentFilter.level === 'ALL' && <View style={styles.radioDot} />}
                </View>
                <Text style={[
                  styles.filterOptionText,
                  currentFilter.level === 'ALL' && styles.filterOptionTextActive
                ]}>
                  All Progress
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, currentFilter.level === 'PV_AREA' && styles.filterOptionActive]}
                onPress={() => handleLevelChange('PV_AREA')}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, currentFilter.level === 'PV_AREA' && styles.radioActive]}>
                  {currentFilter.level === 'PV_AREA' && <View style={styles.radioDot} />}
                </View>
                <Text style={[
                  styles.filterOptionText,
                  currentFilter.level === 'PV_AREA' && styles.filterOptionTextActive
                ]}>
                  By PV Area
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, currentFilter.level === 'PV_AREA_BLOCK' && styles.filterOptionActive]}
                onPress={() => handleLevelChange('PV_AREA_BLOCK')}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, currentFilter.level === 'PV_AREA_BLOCK' && styles.radioActive]}>
                  {currentFilter.level === 'PV_AREA_BLOCK' && <View style={styles.radioDot} />}
                </View>
                <Text style={[
                  styles.filterOptionText,
                  currentFilter.level === 'PV_AREA_BLOCK' && styles.filterOptionTextActive
                ]}>
                  By PV Area + Block
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, currentFilter.level === 'SUPERVISOR' && styles.filterOptionActive]}
                onPress={() => handleLevelChange('SUPERVISOR')}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, currentFilter.level === 'SUPERVISOR' && styles.radioActive]}>
                  {currentFilter.level === 'SUPERVISOR' && <View style={styles.radioDot} />}
                </View>
                <Text style={[
                  styles.filterOptionText,
                  currentFilter.level === 'SUPERVISOR' && styles.filterOptionTextActive
                ]}>
                  By Supervisor
                </Text>
              </TouchableOpacity>

              {currentFilter.level === 'PV_AREA' && (
                <>
                  <Text style={[styles.filterSubLabel, { marginTop: 16 }]}>Select PV Area</Text>
                  {pvAreas.map((pvArea) => (
                    <TouchableOpacity
                      key={pvArea.id}
                      style={[
                        styles.filterOption,
                        currentFilter.pvAreaId === pvArea.id && styles.filterOptionActive
                      ]}
                      onPress={() => handlePvAreaSelect(pvArea.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.radio,
                        currentFilter.pvAreaId === pvArea.id && styles.radioActive
                      ]}>
                        {currentFilter.pvAreaId === pvArea.id && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[
                        styles.filterOptionText,
                        currentFilter.pvAreaId === pvArea.id && styles.filterOptionTextActive
                      ]}>
                        {pvArea.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {currentFilter.level === 'PV_AREA_BLOCK' && (
                <>
                  <Text style={[styles.filterSubLabel, { marginTop: 16 }]}>Select PV Area</Text>
                  {pvAreas.map((pvArea) => (
                    <TouchableOpacity
                      key={pvArea.id}
                      style={[
                        styles.filterOption,
                        currentFilter.pvAreaId === pvArea.id && styles.filterOptionActive
                      ]}
                      onPress={() => handlePvAreaSelect(pvArea.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.radio,
                        currentFilter.pvAreaId === pvArea.id && styles.radioActive
                      ]}>
                        {currentFilter.pvAreaId === pvArea.id && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[
                        styles.filterOptionText,
                        currentFilter.pvAreaId === pvArea.id && styles.filterOptionTextActive
                      ]}>
                        {pvArea.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  
                  {currentFilter.pvAreaId && (
                    <>
                      <Text style={[styles.filterSubLabel, { marginTop: 16 }]}>Select Block</Text>
                      {filteredBlockAreas.map((block) => (
                        <TouchableOpacity
                          key={block.id}
                          style={[
                            styles.filterOption,
                            currentFilter.blockAreaId === block.id && styles.filterOptionActive
                          ]}
                          onPress={() => handleBlockAreaSelect(block.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.radio,
                            currentFilter.blockAreaId === block.id && styles.radioActive
                          ]}>
                            {currentFilter.blockAreaId === block.id && <View style={styles.radioDot} />}
                          </View>
                          <Text style={[
                            styles.filterOptionText,
                            currentFilter.blockAreaId === block.id && styles.filterOptionTextActive
                          ]}>
                            {block.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </>
              )}

              {currentFilter.level === 'SUPERVISOR' && (
                <>
                  <Text style={[styles.filterSubLabel, { marginTop: 16 }]}>Select Supervisor</Text>
                  {supervisorUsers.length === 0 ? (
                    <View style={styles.emptyFilterState}>
                      <Text style={styles.emptyFilterText}>No supervisors found</Text>
                    </View>
                  ) : (
                    supervisorUsers.map((supervisor) => (
                      <TouchableOpacity
                        key={supervisor.id}
                        style={[
                          styles.filterOption,
                          currentFilter.supervisorId === supervisor.id && styles.filterOptionActive
                        ]}
                        onPress={() => handleSupervisorSelect(supervisor.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.radio,
                          currentFilter.supervisorId === supervisor.id && styles.radioActive
                        ]}>
                          {currentFilter.supervisorId === supervisor.id && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[
                          styles.filterOptionText,
                          currentFilter.supervisorId === supervisor.id && styles.filterOptionTextActive
                        ]}>
                          {supervisor.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.expandableHeader}
                onPress={() => setExpandedViews(!expandedViews)}
                activeOpacity={0.7}
              >
                <Activity size={16} color="#5f6368" strokeWidth={2} />
                <Text style={styles.sectionLabel}>VIEW BY</Text>
              </TouchableOpacity>

              {expandedViews && (
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[styles.viewOption, currentView === 'TASKS_PROGRESS' && styles.viewOptionActive]}
                    onPress={() => onViewChange('TASKS_PROGRESS')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.viewOptionText,
                      currentView === 'TASKS_PROGRESS' && styles.viewOptionTextActive
                    ]}>
                      Tasks Progress
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.viewOption, currentView === 'ACTIVITY_PROGRESS' && styles.viewOptionActive]}
                    onPress={() => onViewChange('ACTIVITY_PROGRESS')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.viewOptionText,
                      currentView === 'ACTIVITY_PROGRESS' && styles.viewOptionTextActive
                    ]}>
                      Per Activity Progress
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showWeekPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeekPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowWeekPicker(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Week</Text>
              <TouchableOpacity 
                onPress={() => setShowWeekPicker(false)} 
                style={styles.modalClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#5f6368" />
              </TouchableOpacity>
            </View>
            
            {Platform.OS === 'web' ? (
              <View style={styles.webDatePicker}>
                <input
                  type="date"
                  value={tempWeekDate.toISOString().split('T')[0]}
                  onChange={(e: any) => setTempWeekDate(new Date(e.target.value))}
                  style={{
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1px solid #dadce0',
                    width: '100%',
                  }}
                />
              </View>
            ) : (
              <DateTimePicker
                value={tempWeekDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setTempWeekDate(selectedDate);
                }}
                style={{ height: 200 }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowWeekPicker(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleWeekDateConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonConfirmText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowMonthPicker(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Month</Text>
              <TouchableOpacity 
                onPress={() => setShowMonthPicker(false)} 
                style={styles.modalClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#5f6368" />
              </TouchableOpacity>
            </View>
            
            {Platform.OS === 'web' ? (
              <View style={styles.webDatePicker}>
                <input
                  type="month"
                  value={`${tempMonthDate.getFullYear()}-${String(tempMonthDate.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e: any) => {
                    const [year, month] = e.target.value.split('-');
                    setTempMonthDate(new Date(parseInt(year), parseInt(month) - 1, 1));
                  }}
                  style={{
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1px solid #dadce0',
                    width: '100%',
                  }}
                />
              </View>
            ) : (
              <DateTimePicker
                value={tempMonthDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setTempMonthDate(selectedDate);
                }}
                style={{ height: 200 }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowMonthPicker(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleMonthDateConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonConfirmText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e8eaed',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#202124',
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#80868b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  sectionItemActive: {
    backgroundColor: '#e8f0fe',
  },
  sectionItemText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#5f6368',
  },
  sectionItemTextActive: {
    fontWeight: '600' as const,
    color: '#4285F4',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8eaed',
    marginVertical: 16,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  filterOptions: {
    paddingTop: 8,
  },
  filterOptionsInline: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 8,
    borderRadius: 8,
  },
  filterSubLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#5f6368',
    marginBottom: 8,
    marginTop: 4,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 10,
    marginBottom: 2,
  },
  filterOptionActive: {
    backgroundColor: '#f8f9fa',
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#5f6368',
  },
  filterOptionTextActive: {
    fontWeight: '600' as const,
    color: '#202124',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dadce0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#4285F4',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4285F4',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#dadce0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  checkmark: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  viewOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#f8f9fa',
  },
  viewOptionActive: {
    backgroundColor: '#e8f0fe',
  },
  viewOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#5f6368',
    textAlign: 'center',
  },
  viewOptionTextActive: {
    fontWeight: '600' as const,
    color: '#4285F4',
  },
  emptyFilterState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyFilterText: {
    fontSize: 13,
    color: '#80868b',
    fontStyle: 'italic' as const,
  },
  timeRangeOptions: {
    marginTop: 8,
  },
  selectedDateContainer: {
    marginTop: 8,
    marginLeft: 28,
    paddingLeft: 12,
    paddingVertical: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#4285F4',
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  selectedDateText: {
    fontSize: 12,
    color: '#34A853',
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#202124',
  },
  modalClose: {
    padding: 4,
  },
  webDatePicker: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalButtonCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#5f6368',
  },
  modalButtonConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#4285F4',
  },
  modalButtonConfirmText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
});
