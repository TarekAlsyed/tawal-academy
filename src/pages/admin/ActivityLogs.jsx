import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiActivity, FiUser, FiClock, FiMonitor, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import { adminGetActivityLogs, adminDeleteAllActivityLogs } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
// import '../../styles/AdminPages.css'; // Commented out to use COMPLETE-ADMIN-DESIGN.css

const ActivityLogs = () => {
  const { admin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const isSuper = admin?.is_super_admin === true || admin?.is_super_admin === 'true';

  const ACTION_MAP = {
    'admin_login': 'تسجيل دخول مشرف',
    'admin_logout': 'تسجيل خروج مشرف',
    'student_login': 'تسجيل دخول طالب',
    'student_logout': 'تسجيل خروج طالب',
    'create_admin': 'إضافة مشرف جديد',
    'update_admin': 'تحديث بيانات مشرف',
    'delete_admin': 'حذف مشرف',
    'update_admin_permissions': 'تحديث صلاحيات مشرف',
    'EXAM_START': 'بدء امتحان',
    'EXAM_SUBMIT': 'تسليم امتحان',
    'create_subject': 'إضافة مادة دراسية',
    'update_subject': 'تحديث مادة دراسية',
    'delete_subject': 'حذف مادة دراسية',
    'create_exam': 'إضافة امتحان',
    'update_exam': 'تحديث امتحان',
    'delete_exam': 'حذف امتحان',
    'block_student': 'حظر طالب',
    'unblock_student': 'إلغاء حظر طالب',
    'delete_student': 'حذف طالب',
    'reply_question': 'الرد على سؤال',
    'delete_question': 'حذف سؤال',
    'approve_request': 'الموافقة على طلب',
    'reject_request': 'رفض طلب',
    'upload_pdf': 'رفع ملف PDF',
    'delete_pdf': 'حذف ملف PDF',
    'upload_image': 'رفع صورة',
    'delete_image': 'حذف صورة',
    'update_pdf_watermark': 'تعديل علامة مائية'
  };

  const KEY_MAP = {
    'examName': 'اسم الامتحان',
    'subjectName': 'اسم المادة',
    'studentName': 'اسم الطالب',
    'adminName': 'اسم المشرف',
    'ip': 'عنوان IP',
    'deviceId': 'معرف الجهاز',
    'status': 'الحالة',
    'grade': 'الدرجة',
    'score': 'النتيجة',
    'total': 'المجموع',
    'browser': 'المتصفح',
    'os': 'نظام التشغيل',
    'reason': 'السبب',
    'duration': 'المدة',
    'question': 'السؤال',
    'answer': 'الإجابة',
    'has_watermark': 'العلامة المائية'
  };

  const translateKey = (key) => {
    return KEY_MAP[key] || key;
  };

  const getActionName = (action) => {
    return ACTION_MAP[action] || action;
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await adminGetActivityLogs({ page, limit });
      if (response.data.success) {
        setLogs(response.data.data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('فشل تحميل سجل النشاط');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit]);

  const handleDeleteAll = async () => {
    if (!isSuper) {
      toast.error('عذراً، هذا الإجراء متاح فقط للمدير العام');
      return;
    }

    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من حذف جميع سجلات النشاط نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminDeleteAllActivityLogs();
      if (response.data.success) {
        toast.success(response.data.message);
        setPage(1);
        fetchLogs();
      }
    } catch (error) {
      toast.error('فشل حذف سجل النشاط');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ar-EG');
  };

  const getActorInfo = (log) => {
    if (log.admin_name) {
      return {
        name: log.admin_name,
        role: 'مشرف',
        type: 'admin',
        color: '#10b981', // green
        bgColor: 'rgba(16,185,129,0.1)'
      };
    }
    if (log.user_name) {
      return {
        name: log.user_name,
        role: 'طالب',
        type: 'student',
        color: '#3b82f6', // blue
        bgColor: 'rgba(59,130,246,0.1)'
      };
    }
    return {
      name: 'غير معروف',
      role: '-',
      type: 'unknown',
      color: '#64748b',
      bgColor: 'rgba(100,116,139,0.1)'
    };
  };

  const renderDetails = (details) => {
    if (!details) return '-';
    try {
      // If it's already an object, use it directly
      const data = typeof details === 'string' ? JSON.parse(details) : details;
      
      // تنسيق مخصص بناءً على المحتوى
      const formattedParts = [];
      
      // First priority fields
      if (data.examName) formattedParts.push(`${KEY_MAP['examName']}: ${data.examName}`);
      if (data.subjectName) formattedParts.push(`${KEY_MAP['subjectName']}: ${data.subjectName}`);
      if (data.studentName) formattedParts.push(`${KEY_MAP['studentName']}: ${data.studentName}`);
      if (data.adminName) formattedParts.push(`${KEY_MAP['adminName']}: ${data.adminName}`);
      
      // Add other fields that are in KEY_MAP but not yet added
      Object.keys(data).forEach(key => {
        if (['examName', 'subjectName', 'studentName', 'adminName', 'ip', 'deviceId', 'user_agent'].includes(key)) return;
        if (KEY_MAP[key]) {
          formattedParts.push(`${KEY_MAP[key]}: ${data[key]}`);
        }
      });

      if (data.ip) formattedParts.push(`${KEY_MAP['ip']}: ${data.ip}`);
      
      if (formattedParts.length > 0) {
        return formattedParts.join(' | ');
      }

      // إذا لم يكن هناك تنسيق مخصص، نعرض البيانات بشكل مقروء مع محاولة ترجمة المفاتيح
      const entries = Object.entries(data);
      if (entries.length === 0) return '-';
      
      return entries.map(([key, value]) => {
        const translatedKey = translateKey(key);
        // Clean up value if it's a string with quotes
        const cleanValue = typeof value === 'string' ? value.replace(/"/g, '') : value;
        return `${translatedKey}: ${cleanValue}`;
      }).join(' | ').substring(0, 150) + (entries.length > 5 ? '...' : '');
        
    } catch (e) {
      return details;
    }
  };

  return (
    <AdminLayout title="سجل النشاط">
      <header className="admin-header">
        <div className="admin-header-title">
          <h1><FiActivity /> سجل النشاط</h1>
          <p>تتبع نشاطات المشرفين والطلاب في النظام</p>
        </div>
        <div className="admin-header-actions">
          {isSuper && (
            <button 
              className="admin-btn admin-btn-danger" 
              onClick={handleDeleteAll}
              style={{ background: 'var(--admin-danger)', color: 'white' }}
            >
              <FiTrash2 /> حذف السجل بالكامل
            </button>
          )}
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
              <div className="loading" style={{ color: 'white' }}>جاري التحميل...</div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المستخدم</th>
                      <th>الدور</th>
                      <th>الإجراء</th>
                      <th>التفاصيل</th>
                      <th>IP</th>
                      <th>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log) => {
                        const actor = getActorInfo(log);
                        return (
                          <tr key={log.id}>
                            <td>{log.id}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FiUser />
                                <span>{actor.name}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '20px', 
                                fontSize: '0.85rem',
                                background: actor.bgColor,
                                color: actor.color,
                                border: `1px solid ${actor.bgColor.replace('0.1', '0.2')}`
                              }}>
                                {actor.role}
                              </span>
                            </td>
                            <td>
                              <span style={{ 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '20px', 
                                fontSize: '0.85rem',
                                background: log.admin_id ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                color: log.admin_id ? '#10b981' : '#f59e0b',
                                border: log.admin_id ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)'
                              }}>
                                {getActionName(log.action)}
                              </span>
                            </td>
                            <td title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details} style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {renderDetails(log.details)}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)' }}>
                                <FiMonitor />
                                <span>{log.ip_address || '-'}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)' }}>
                                <FiClock />
                                <span>{formatDate(log.created_at)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>لا يوجد سجلات نشاط</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)}
                  className="admin-btn"
                  style={{ background: 'rgba(255,255,255,0.05)', opacity: page === 1 ? 0.5 : 1 }}
                >
                  السابق
                </button>
                <span style={{ color: 'var(--admin-text-muted)' }}>صفحة {page}</span>
                <button 
                  disabled={logs.length < limit} 
                  onClick={() => setPage(p => p + 1)}
                  className="admin-btn"
                  style={{ background: 'rgba(255,255,255,0.05)', opacity: logs.length < limit ? 0.5 : 1 }}
                >
                  التالي
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ActivityLogs;
