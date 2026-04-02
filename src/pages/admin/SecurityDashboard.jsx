import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
  FiShield, FiActivity, FiAlertCircle, 
  FiSearch, FiRefreshCw, FiAlertTriangle, FiInfo,
  FiFileText, FiTrendingUp, FiClock, FiMap,
  FiGlobe, FiLock, FiUserCheck, FiSmartphone,
  FiMonitor, FiLogOut, FiTrash2, FiSettings
} from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';

// Mock Heatmap Component (Simplified)
const ThreatHeatmap = ({ data }) => {
  return (
    <div className="threat-heatmap" style={{ height: '300px', background: 'var(--admin-bg-primary)', borderRadius: '12px', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1, pointerEvents: 'none' }}>
        <FiGlobe size={400} style={{ position: 'absolute', top: '-50px', right: '-50px', color: 'var(--admin-primary)' }} />
      </div>
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FiMap /> خريطة التهديدات العالمية
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '120px', fontSize: '0.9rem' }}>{item.city}</div>
            <div style={{ flex: 1, height: '8px', background: 'var(--admin-bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(item.count / 50) * 100}%` }}
                transition={{ duration: 1, delay: idx * 0.1 }}
                style={{ 
                  height: '100%', 
                  background: item.count > 30 ? 'var(--admin-danger)' : item.count > 15 ? 'var(--admin-warning)' : 'var(--admin-success)' 
                }} 
              />
            </div>
            <div style={{ width: '40px', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }}>{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SecurityDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, logs, sessions, settings
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [settings, setSettings] = useState({
    security_strict_mode: false,
    security_mandatory_mfa: false,
    security_auto_blacklist: true,
    system_maintenance_mode: false
  });

  useEffect(() => {
    fetchSecurityData();
    fetchSessions();
    fetchSettings();
    const interval = setInterval(() => {
        fetchSecurityData();
        fetchSessions();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/security/settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const handleUpdateSetting = async (key, value) => {
    try {
      const response = await api.post('/admin/security/settings', { key, value });
      if (response.data.success) {
        setSettings(prev => ({ ...prev, [key]: value }));
        toast.success('تم تحديث الإعداد بنجاح');
      }
    } catch (error) {
      toast.error('فشل تحديث الإعداد');
    }
  };

  const fetchSecurityData = async () => {
    setRefreshing(true);
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_SECURITY_STATS);
      if (response.data.success) {
        setData(response.data.data);
      } else {
        toast.error(response.data.message || 'فشل تحميل بيانات الأمان');
      }
    } catch (error) {
      console.error('Security fetch error:', error);
      const msg = error.response?.data?.message || 'فشل تحميل بيانات الأمان من السيرفر';
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/admin/sessions');
      if (response.data.success) {
        setSessions(response.data.data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions');
    }
  };

  const handleTerminateSession = async (tokenId) => {
    if (!window.confirm('هل أنت متأكد من إنهاء هذه الجلسة؟')) return;
    try {
      const response = await api.delete(`/admin/sessions/${tokenId}`);
      if (response.data.success) {
        toast.success('تم إنهاء الجلسة بنجاح');
        fetchSessions();
      }
    } catch (error) {
      toast.error('فشل إنهاء الجلسة');
    }
  };

  const handleTerminateOthers = async () => {
    if (!window.confirm('هل أنت متأكد من إنهاء جميع الجلسات الأخرى؟')) return;
    try {
      const response = await api.delete('/admin/sessions/other');
      if (response.data.success) {
        toast.success('تم إنهاء جميع الجلسات الأخرى');
        fetchSessions();
      }
    } catch (error) {
      toast.error('فشل إنهاء الجلسات');
    }
  };

  const handleSetupMFA = async () => {
    try {
      const response = await api.get('/admin/mfa/setup');
      if (response.data.success) {
        setMfaSetup(response.data.data);
        setShowMfaModal(true);
      }
    } catch (error) {
      toast.error('فشل بدء إعداد MFA');
    }
  };

  const handleEnableMFA = async () => {
    try {
      const response = await api.post('/admin/mfa/enable', {
        secret: mfaSetup.secret,
        code: mfaCode
      });
      if (response.data.success) {
        toast.success('تم تفعيل MFA بنجاح');
        setShowMfaModal(false);
        setMfaCode('');
        fetchSecurityData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل تفعيل MFA');
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const statsCards = useMemo(() => [
    { 
      title: 'محاولات الاختراق (24س)', 
      value: data?.stats?.penetrationAttempts24h || 0, 
      icon: <FiShield />, 
      color: 'var(--admin-danger)',
      trend: '+12%'
    },
    { 
      title: 'الجلسات النشطة', 
      value: data?.stats?.activeSessions || 0, 
      icon: <FiUserCheck />, 
      color: 'var(--admin-primary)',
      trend: 'مستقر'
    },
    { 
      title: 'أخطاء النظام الحرجة', 
      value: data?.stats?.criticalErrors || 0, 
      icon: <FiAlertCircle />, 
      color: 'var(--admin-warning)',
      trend: '-5%'
    },
    { 
      title: 'مستوى التهديد الحالي', 
      value: data?.currentThreatLevel === 'safe' ? 'آمن' : data?.currentThreatLevel === 'high' ? 'مرتفع' : 'حرج', 
      icon: <FiActivity />, 
      color: data?.currentThreatLevel === 'safe' ? 'var(--admin-success)' : 'var(--admin-danger)',
      trend: 'مراقب'
    },
  ], [data]);

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="loading">جاري تحميل بيانات الأمان...</div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="security-dashboard-container" style={{ color: 'var(--admin-text)' }}>
        <header className="admin-header" style={{ marginBottom: '2rem' }}>
          <div className="admin-header-title">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FiShield style={{ color: 'var(--admin-primary)' }} /> مركز العمليات الأمنية (SOC)
            </h1>
            <p>مراقبة وحماية المنصة في الوقت الفعلي - Elite Shield v2.0</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
                className="admin-btn admin-btn-secondary" 
                onClick={fetchSecurityData}
                disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? 'spin' : ''} /> تحديث
            </button>
            <button 
                className="admin-btn admin-btn-primary"
                onClick={handleSetupMFA}
            >
              <FiLock /> إعداد MFA
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--admin-border)', paddingBottom: '0.5rem' }}>
          {[
            { id: 'overview', label: 'نظرة عامة', icon: <FiTrendingUp /> },
            { id: 'logs', label: 'سجلات التهديدات', icon: <FiFileText /> },
            { id: 'sessions', label: 'الجلسات النشطة', icon: <FiMonitor /> },
            { id: 'settings', label: 'الإعدادات الأمنية', icon: <FiSettings /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? 'var(--admin-primary-light)' : 'transparent',
                color: activeTab === tab.id ? 'var(--admin-primary)' : 'var(--admin-text-muted)',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                transition: 'all 0.3s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="admin-content"
            >
              {/* Stats Cards */}
              <div className="admin-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                {statsCards.map((card, idx) => (
                  <div key={idx} className="admin-card" style={{ 
                    position: 'relative', 
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '140px',
                    padding: '1.5rem'
                  }}>
                    <div style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      left: '10px', 
                      opacity: 0.15, 
                      fontSize: '3.5rem', 
                      color: card.color,
                      zIndex: 0
                    }}>
                      {card.icon}
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.95rem', marginBottom: '0.75rem', fontWeight: '500' }}>{card.title}</div>
                      <div style={{ fontSize: '2rem', fontWeight: '800', color: card.color, lineHeight: '1' }}>{card.value}</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: card.trend.startsWith('+') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          color: card.trend.startsWith('+') ? 'var(--admin-danger)' : 'var(--admin-success)',
                          fontWeight: 'bold'
                        }}>
                          {card.trend}
                        </span>
                        <span style={{ color: 'var(--admin-text-muted)' }}>مقارنة بالأمس</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', marginBottom: '2rem' }}>
                <div className="admin-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>تحليل التهديدات (7 أيام)</h3>
                  <div style={{ height: '300px', width: '100%', minHeight: '300px', position: 'relative', overflow: 'hidden' }}>
                    {data?.timeline && data.timeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={data.timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorThreat" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--admin-primary)" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="var(--admin-primary)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                          <XAxis dataKey="date" stroke="var(--admin-text-muted)" fontSize={12} />
                          <YAxis stroke="var(--admin-text-muted)" fontSize={12} />
                          <Tooltip 
                              contentStyle={{ background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
                              itemStyle={{ color: 'var(--admin-primary)' }}
                              labelStyle={{ fontWeight: 'bold' }}
                              formatter={(value) => [value, 'تهديدات']}
                          />
                          <Area type="monotone" dataKey="count" stroke="var(--admin-primary)" fillOpacity={1} fill="url(#colorThreat)" name="عدد التهديدات" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--admin-text-muted)' }}>
                        لا توجد بيانات تهديدات كافية للعرض
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>توزيع أنواع الهجمات</h3>
                  <div style={{ height: '300px', width: '100%', minHeight: '300px', display: 'flex', position: 'relative', overflow: 'hidden' }}>
                    {data?.intrusionAttempts && data.intrusionAttempts.length > 0 ? (
                      <>
                        <div style={{ flex: 1, height: '100%' }}>
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <PieChart>
                              <Pie
                                data={data.intrusionAttempts}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="threat_type"
                              >
                                {data.intrusionAttempts.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value, name) => [value, name.replace(/_/g, ' ')]} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem', paddingLeft: '1.5rem', minWidth: '180px' }}>
                          {data.intrusionAttempts.map((entry, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: COLORS[index % COLORS.length] }}></div>
                              <span style={{ whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{entry.threat_type.replace(/_/g, ' ')}: <strong>{entry.count}</strong></span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--admin-text-muted)' }}>
                        لا توجد محاولات اختراق مسجلة
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Heatmap & Recent Events Row */}
              <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                <ThreatHeatmap data={data?.heatmapData || []} />
                
                <div className="admin-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiClock /> أحداث أمنية أخيرة
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {data?.recentErrors && data.recentErrors.length > 0 ? (
                      data.recentErrors.slice(0, 5).map((error, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--admin-bg-secondary)', borderRadius: '8px', borderRight: `4px solid ${error.severity === 'critical' ? 'var(--admin-danger)' : 'var(--admin-warning)'}` }}>
                          <div style={{ color: error.severity === 'critical' ? 'var(--admin-danger)' : 'var(--admin-warning)' }}>
                            <FiAlertTriangle size={20} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{error.error_type}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{error.message}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: '0.5rem' }}>
                              {new Date(error.created_at).toLocaleString('ar-EG')}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)' }}>
                        <FiShield size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>لا توجد أحداث أمنية حديثة. النظام مستقر.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sessions' && (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="admin-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3>إدارة الجلسات النشطة</h3>
                <button className="admin-btn admin-btn-danger" onClick={handleTerminateOthers}>
                  <FiLogOut /> إنهاء جميع الجلسات الأخرى
                </button>
              </div>
              
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>المشرف</th>
                      <th>الجهاز / المتصفح</th>
                      <th>عنوان IP</th>
                      <th>آخر نشاط</th>
                      <th>تاريخ البدء</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                          <FiInfo size={40} style={{ marginBottom: '1rem', display: 'block', margin: '0 auto' }} />
                          لا توجد جلسات نشطة حالياً. يرجى تسجيل الخروج والدخول مجدداً لتفعيل نظام تتبع الجلسات المطور.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((session) => (
                        <tr key={session.id}>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{session.admin_name || 'أنت'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>{session.admin_email}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {session.user_agent?.toLowerCase().includes('mobile') ? <FiSmartphone /> : <FiMonitor />}
                              <div style={{ fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={session.user_agent}>
                                {session.user_agent || 'متصفح غير معروف'}
                              </div>
                            </div>
                          </td>
                          <td>{session.ip_address}</td>
                          <td>{new Date(session.last_activity).toLocaleString('ar-EG')}</td>
                          <td>{new Date(session.created_at).toLocaleString('ar-EG')}</td>
                          <td>
                            <button 
                              className="admin-btn admin-btn-danger admin-btn-sm" 
                              onClick={() => handleTerminateSession(session.token_id)}
                              title="إنهاء الجلسة"
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="admin-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h3>سجل أخطاء النظام المتقدم</h3>
                  <p style={{ color: 'var(--admin-text-muted)' }}>عرض جميع الأخطاء والمشاكل التقنية المكتشفة من قبل نظام المراقبة.</p>
                </div>
                <button className="admin-btn admin-btn-secondary" onClick={async () => {
                  if (!window.confirm('هل أنت متأكد من مسح جميع السجلات القديمة المحلولة؟')) return;
                  try {
                    const response = await api.post('/admin/security/logs/clear');
                    if (response.data.success) {
                      toast.success(`تم مسح ${response.data.deletedErrors} خطأ و ${response.data.deletedAuditLogs} سجل أمني`);
                      fetchSecurityData();
                    } else {
                      toast.error(response.data.message || 'فشل مسح السجلات');
                    }
                  } catch (err) {
                    toast.error('فشل مسح السجلات');
                  }
                }}>
                  مسح السجلات القديمة
                </button>
                <button className="admin-btn admin-btn-success" onClick={async () => {
                  try {
                    const response = await api.post('/admin/security/errors/resolve-all');
                    if (response.data.success) {
                      toast.success(response.data.message || 'تم حل جميع الأخطاء بنجاح');
                      fetchSecurityData();
                    } else {
                      toast.error(response.data.message || 'فشل حل الأخطاء');
                    }
                  } catch (err) {
                    toast.error('فشل حل الأخطاء');
                  }
                }}>
                  تم حل الجميع
                </button>
              </div>
              
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>نوع الخطأ</th>
                      <th>المستوى</th>
                      <th>المكون</th>
                      <th>الرسالة</th>
                      <th>التكرار</th>
                      <th>آخر ظهور</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentErrors?.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                          لا توجد أخطاء نشطة حالياً. النظام مستقر.
                        </td>
                      </tr>
                    ) : (
                      data?.recentErrors?.map((error) => (
                        <tr key={error.id}>
                          <td>
                            <div style={{ fontWeight: 'bold', color: error.severity === 'critical' ? 'var(--admin-danger)' : 'var(--admin-warning)' }}>
                              {error.error_type}
                            </div>
                          </td>
                          <td>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              background: error.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: error.severity === 'critical' ? 'var(--admin-danger)' : 'var(--admin-warning)',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>
                              {error.severity === 'critical' ? 'حرج' : error.severity === 'high' ? 'عالي' : 'متوسط'}
                            </span>
                          </td>
                          <td>{error.component}</td>
                          <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={error.message}>
                            {error.message}
                          </td>
                          <td>{error.repetition_count}</td>
                          <td>{new Date(error.last_occurrence).toLocaleString('ar-EG')}</td>
                          <td>
                            <button 
                              className="admin-btn admin-btn-success admin-btn-sm" 
                              onClick={async () => {
                                try {
                                  await api.post(`/admin/security/errors/${error.id}/resolve`);
                                  toast.success('تم تمييز الخطأ كمحلول');
                                  fetchSecurityData();
                                } catch (err) {
                                  toast.error('فشل حل الخطأ');
                                }
                              }}
                              title="تم الحل"
                            >
                              <FiUserCheck />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="admin-grid"
            >
              <div className="admin-card">
                <h3>تكوين الحماية (Elite Shield)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>وضع الحماية الصارم (Strict Mode)</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>حظر أي طلب لا يحتوي على توقيع HMAC صالح</div>
                    </div>
                    <div className="admin-switch-container">
                        <input 
                          type="checkbox" 
                          id="strictMode" 
                          checked={!!settings.security_strict_mode}
                          onChange={(e) => handleUpdateSetting('security_strict_mode', e.target.checked)}
                        />
                        <label htmlFor="strictMode"></label>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>التحقق الثنائي الإلزامي (Mandatory MFA)</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>إلزام جميع المشرفين بتفعيل MFA للدخول</div>
                    </div>
                    <div className="admin-switch-container">
                        <input 
                          type="checkbox" 
                          id="mandatoryMFA" 
                          checked={!!settings.security_mandatory_mfa}
                          onChange={(e) => handleUpdateSetting('security_mandatory_mfa', e.target.checked)}
                        />
                        <label htmlFor="mandatoryMFA"></label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>حظر الـ IPs المشبوهة تلقائياً</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>إضافة أي IP يقوم بهجمات متكررة للقائمة السوداء</div>
                    </div>
                    <div className="admin-switch-container">
                        <input 
                          type="checkbox" 
                          id="autoBlacklist" 
                          checked={!!settings.security_auto_blacklist}
                          onChange={(e) => handleUpdateSetting('security_auto_blacklist', e.target.checked)}
                        />
                        <label htmlFor="autoBlacklist"></label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>وضع الصيانة (Maintenance Mode)</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>إغلاق المنصة أمام الطلاب لأعمال الصيانة</div>
                    </div>
                    <div className="admin-switch-container">
                        <input 
                          type="checkbox" 
                          id="maintenanceMode" 
                          checked={!!settings.system_maintenance_mode}
                          onChange={(e) => handleUpdateSetting('system_maintenance_mode', e.target.checked)}
                        />
                        <label htmlFor="maintenanceMode"></label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border)' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--admin-danger)' }}>إعادة ضبط المصنع (Factory Reset)</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>مسح جميع السجلات الأمنية والأخطاء والقائمة السوداء بالكامل</div>
                    </div>
                    <button 
                      className="admin-btn admin-btn-danger"
                      onClick={async () => {
                        if (!window.confirm('تحذير: هذا الإجراء سيمسح جميع السجلات الأمنية والأخطاء والقائمة السوداء بشكل نهائي. هل أنت متأكد؟')) return;
                        try {
                          const response = await api.post('/admin/security/factory-reset');
                          if (response.data.success) {
                            toast.success(response.data.message);
                            fetchSecurityData();
                          } else {
                            toast.error(response.data.message || 'فشل إعادة ضبط المصنع');
                          }
                        } catch (err) {
                          toast.error('فشل إعادة ضبط المصنع');
                        }
                      }}
                    >
                      إعادة ضبط
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-card">
                <h3>إحصائيات النظام (Real-time)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                  <div style={{ padding: '1.25rem', background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: '500' }}>
                      <span style={{ color: 'var(--admin-text-muted)' }}>استهلاك الذاكرة</span>
                      <span style={{ color: data?.systemResources?.memoryUsage > 80 ? 'var(--admin-danger)' : 'var(--admin-warning)', fontWeight: 'bold' }}>{data?.systemResources?.memoryUsage || 0}%</span>
                    </div>
                    <div style={{ height: '10px', background: 'var(--admin-bg-secondary)', borderRadius: '5px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${data?.systemResources?.memoryUsage || 0}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ height: '100%', background: `linear-gradient(90deg, ${data?.systemResources?.memoryUsage > 80 ? 'var(--admin-danger)' : 'var(--admin-warning)'}, ${data?.systemResources?.memoryUsage > 80 ? '#ef4444' : '#fbbf24'})` }}
                      />
                    </div>
                  </div>
                  <div style={{ padding: '1.25rem', background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: '500' }}>
                      <span style={{ color: 'var(--admin-text-muted)' }}>استهلاك المعالج</span>
                      <span style={{ color: 'var(--admin-success)', fontWeight: 'bold' }}>{data?.systemResources?.cpuUsage || 0}%</span>
                    </div>
                    <div style={{ height: '10px', background: 'var(--admin-bg-secondary)', borderRadius: '5px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${data?.systemResources?.cpuUsage || 0}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ height: '100%', background: 'linear-gradient(90deg, var(--admin-success), #4ade80)' }}
                      />
                    </div>
                  </div>
                  <div style={{ padding: '1.25rem', background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: '500' }}>
                      <span style={{ color: 'var(--admin-text-muted)' }}>زمن الاستجابة (API)</span>
                      <span style={{ color: 'var(--admin-primary)', fontWeight: 'bold' }}>{data?.systemResources?.responseTime || 0}ms</span>
                    </div>
                    <div style={{ height: '10px', background: 'var(--admin-bg-secondary)', borderRadius: '5px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '35%' }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ height: '100%', background: 'linear-gradient(90deg, var(--admin-primary), #6366f1)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MFA Setup Modal */}
        <AnimatePresence>
          {showMfaModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="admin-card" 
                style={{ maxWidth: '450px', width: '90%', textAlign: 'center' }}
              >
                <FiLock size={48} style={{ color: 'var(--admin-primary)', marginBottom: '1rem' }} />
                <h2>إعداد التحقق الثنائي (MFA)</h2>
                <p style={{ color: 'var(--admin-text-muted)', marginBottom: '1.5rem' }}>قم بمسح رمز الاستجابة السريعة (QR Code) باستخدام تطبيق Authenticator (مثل Google Authenticator أو Authy).</p>
                
                {mfaSetup && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <img src={mfaSetup.qrCode} alt="MFA QR Code" style={{ border: '8px solid white', borderRadius: '8px' }} />
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--admin-text-muted)' }}>أو أدخل الرمز يدوياً: </span>
                      <code style={{ background: 'var(--admin-bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{mfaSetup.secret}</code>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <input 
                    type="text" 
                    className="admin-input" 
                    placeholder="أدخل رمز الـ 6 أرقام هنا..." 
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                    maxLength={6}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="admin-btn admin-btn-secondary" style={{ flex: 1 }} onClick={() => setShowMfaModal(false)}>إلغاء</button>
                  <button className="admin-btn admin-btn-primary" style={{ flex: 1 }} onClick={handleEnableMFA}>تفعيل الحماية</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .threat-heatmap {
          background-image: radial-gradient(circle at 50% 50%, var(--admin-bg-secondary) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .admin-switch-container {
            position: relative;
            width: 50px;
            height: 26px;
        }
        .admin-switch-container input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .admin-switch-container label {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: var(--admin-border);
            transition: .4s;
            border-radius: 34px;
        }
        .admin-switch-container label:before {
            position: absolute;
            content: "";
            height: 18px; width: 18px;
            left: 4px; bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        .admin-switch-container input:checked + label {
            background-color: var(--admin-primary);
        }
        .admin-switch-container input:checked + label:before {
            transform: translateX(24px);
        }
      `}</style>
    </AdminLayout>
  );
};

export default SecurityDashboard;