import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiAward, FiSlash, FiCheck, FiTrash2, FiSmartphone, FiUnlock, FiActivity, FiSearch, FiFilter, FiDownload, FiX, FiAlertTriangle } from 'react-icons/fi';
import api, { adminGetStudentLogs, adminDeleteAllStudents } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
// import '../../styles/AdminPages.css'; // Commented out to use COMPLETE-ADMIN-DESIGN.css

const Students = () => {
  const { admin } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState([]);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  const isSuper = admin?.is_super_admin === true || admin?.is_super_admin === 'true';
  
  const getPermission = (section, action) => {
      if (isSuper) return true;
      const perm = admin?.permissions_detailed?.[section]?.[action];
      if (perm === true) return true;
      if (typeof perm === 'object' && perm !== null) return perm.allowed === true;
      return false;
  };

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
    'delete_image': 'حذف صورة'
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
    'answer': 'الإجابة'
  };

  const translateAction = (action) => {
    return ACTION_MAP[action] || action;
  };

  const translateKey = (key) => {
    return KEY_MAP[key] || key;
  };

  const renderDetails = (details) => {
    if (!details) return '-';
    try {
      const data = typeof details === 'string' ? JSON.parse(details) : details;
      const formattedParts = [];
      
      // First priority fields
      if (data.examName) formattedParts.push(`${KEY_MAP['examName']}: ${data.examName}`);
      if (data.subjectName) formattedParts.push(`${KEY_MAP['subjectName']}: ${data.subjectName}`);
      if (data.studentName) formattedParts.push(`${KEY_MAP['studentName']}: ${data.studentName}`);
      if (data.adminName) formattedParts.push(`${KEY_MAP['adminName']}: ${data.adminName}`);
      
      // Add other fields
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

      const entries = Object.entries(data);
      if (entries.length === 0) return '-';
      
      return entries.map(([key, value]) => {
        const translatedKey = translateKey(key);
        const cleanValue = typeof value === 'string' ? value.replace(/"/g, '') : value;
        return `${translatedKey}: ${cleanValue}`;
      }).join(' | ').substring(0, 150) + (entries.length > 5 ? '...' : '');
        
    } catch (e) {
      return details;
    }
  };

  // التحقق من الصلاحيات التفصيلية
  const canBlock = admin?.is_super_admin || admin?.permissions_detailed?.students?.block || admin?.permissions_detailed?.students?.unblock;
  const canDelete = admin?.is_super_admin || admin?.permissions_detailed?.students?.delete;

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_STUDENTS);
      if (response.data.success) {
        setStudents(response.data.data.students);
      }
    } catch (error) {
      toast.error('فشل تحميل قائمة الطلبة');
    } finally {
      setLoading(false);
    }
  };

  const handleShowLogs = async (studentId, studentName) => {
    setSelectedStudentName(studentName);
    setShowLogsModal(true);
    setLogsLoading(true);
    try {
      const response = await adminGetStudentLogs(studentId);
      if (response.data.success) {
        setSelectedStudentLogs(response.data.data.logs);
      }
    } catch (error) {
      toast.error('فشل تحميل سجل النشاط');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleBlock = async (studentId, currentStatus) => {
    try {
      const isBlocked = currentStatus === 'blocked';
      const response = await api.post(
        isBlocked ? API_ENDPOINTS.ADMIN_UNBLOCK_STUDENT(studentId) : API_ENDPOINTS.ADMIN_BLOCK_STUDENT(studentId),
        { reason: 'تم الحظر من قبل الإدارة' }
      );

      if (response.data.success) {
        toast.success(isBlocked ? 'تم إلغاء الحظر عن الطالب والجهاز' : 'تم حظر الطالب والجهاز');
        fetchStudents();
      }
    } catch (error) {
      toast.error('فشل تغيير حالة الطالب');
    }
  };

  const handleUnblockDevice = async (deviceId) => {
    if (!deviceId) return;
    
    try {
      const response = await api.post(API_ENDPOINTS.ADMIN_UNBLOCK_DEVICE, { deviceId });

      if (response.data.success) {
        toast.success('تم إلغاء حظر الجهاز بنجاح');
        fetchStudents();
      }
    } catch (error) {
      toast.error('فشل إلغاء حظر الجهاز');
    }
  };

  const handleUnblockEmail = async (email) => {
    if (!email) return;
    
    try {
      const response = await api.post(API_ENDPOINTS.ADMIN_UNBLOCK_EMAIL, { email });

      if (response.data.success) {
        toast.success('تم إلغاء حظر الإيميل بنجاح');
        fetchStudents();
      }
    } catch (error) {
      toast.error('فشل إلغاء حظر الإيميل');
    }
  };

  const handleResetDevice = async (studentId) => {
    if (!window.confirm('هل أنت متأكد من إعادة تعيين الجهاز لهذا الطالب؟ سيتمكن الطالب من الدخول من أي جهاز جديد لمرة واحدة.')) return;
    
    try {
      const response = await api.post(API_ENDPOINTS.ADMIN_RESET_DEVICE(studentId));

      if (response.data.success) {
        toast.success('تم إعادة تعيين الجهاز بنجاح');
        fetchStudents();
      }
    } catch (error) {
      toast.error('فشل إعادة تعيين الجهاز');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطالب نهائياً؟ سيتم حذف جميع محاولات الامتحانات والنقاط المرتبطة به.')) return;

    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_DELETE_STUDENT(studentId));
      if (response.data.success) {
        toast.success('تم حذف الطالب بنجاح');
        fetchStudents();
      }
    } catch (error) {
      // 403 and 202 are handled by interceptor
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        toast.error('فشل حذف الطالب');
      }
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!isSuper) {
      toast.error('عذراً، هذا الإجراء متاح فقط للمدير العام');
      return;
    }

    const confirm1 = window.confirm('⚠️ تحذير خطير: هل أنت متأكد من حذف جميع الطلاب من المنصة؟');
    if (!confirm1) return;

    const confirm2 = window.confirm('سيتم حذف جميع محاولات الامتحانات، الدرجات، والنقاط لجميع الطلاب. لن يتم حظر إيميلاتهم، بل سيتم مسح حساباتهم فقط ليتمكنوا من التسجيل من جديد. هل تريد الاستمرار؟');
    if (!confirm2) return;

    const typedConfirm = window.prompt('يرجى كتابة كلمة "حذف" للتأكيد النهائي:');
    if (typedConfirm !== 'حذف') {
      toast.info('تم إلغاء عملية الحذف الجماعي');
      return;
    }

    try {
      setLoading(true);
      const response = await adminDeleteAllStudents();
      if (response.data.success) {
        toast.success(response.data.message);
        fetchStudents();
      }
    } catch (error) {
      toast.error('فشل حذف جميع الطلاب');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_STUDENTS_EXPORT, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('تم تصدير قائمة الطلبة');
    } catch (error) {
      toast.error('فشل تصدير قائمة الطلبة');
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="loading" style={{ color: 'var(--admin-primary)' }}>جاري التحميل...</div>
      </div>
    </AdminLayout>
  );

  if (!getPermission('students', 'view')) {
      return (
          <AdminLayout>
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)' }}>
                  <FiSlash size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3>غير مصرح لك بدخول هذه الصفحة</h3>
              </div>
          </AdminLayout>
      );
  }

  return (
    <AdminLayout>
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>إدارة الطلبة</h1>
          <p>عرض وإدارة حسابات الطلبة</p>
        </div>
        <div className="admin-header-actions">
          {isSuper && (
            <button
              className="admin-btn admin-btn-danger"
              onClick={handleDeleteAllStudents}
              style={{ background: 'var(--admin-danger)', color: 'white' }}
            >
              <FiTrash2 /> حذف جميع الطلاب
            </button>
          )}
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleExport}
          >
            <FiDownload /> تصدير PDF
          </button>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-card">
          <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="admin-search" style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
              <input
                type="text"
                placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <FiSearch className="admin-search-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text)' }}>
              <FiFilter />
              <label className="admin-label" style={{ marginBottom: 0 }}>الحالة:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-select"
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <option value="all">الكل</option>
                <option value="active">نشط (متصل)</option>
                <option value="inactive">غير نشط</option>
                <option value="blocked">محظور</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredStudents.length === 0 ? (
            <div className="admin-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                background: 'var(--admin-bg-primary)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1.5rem auto' 
              }}>
                <FiUser size={32} style={{ opacity: 0.5, color: 'var(--admin-text-muted)' }} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--admin-text)' }}>لا توجد نتائج</h3>
              <p style={{ color: 'var(--admin-text-muted)' }}>
                {searchTerm || statusFilter !== 'all' 
                  ? 'لا توجد نتائج مطابقة للبحث' 
                  : 'لا يوجد طلبة مسجلون'}
              </p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="admin-avatar" style={{ width: '64px', height: '64px', fontSize: '2rem' }}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', color: 'var(--admin-text)' }}>{student.name}</h3>
                      <p style={{ margin: 0, color: 'var(--admin-text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiMail /> {student.email}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--admin-bg-primary)', borderRadius: '12px' }}>
                    {student.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>
                        <FiPhone /> {student.phone}
                      </div>
                    )}
                    {student.device_id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }} title={student.device_id}>
                        <FiSmartphone /> جهاز: {student.device_id.substring(0, 8)}...
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-gold)', fontSize: '0.875rem', fontWeight: 'bold' }}>
                      <FiAward /> النقاط: {student.total_points}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <FiUser /> الحالة: 
                      <span className={`status-badge ${student.status === 'active' ? 'success' : student.status === 'blocked' ? 'danger' : 'warning'}`}
                            style={student.status === 'inactive' ? { background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)' } : {}}>
                        {student.status === 'active' ? 'نشط (متصل)' : student.status === 'blocked' ? 'محظور' : 'غير نشط'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto' }}>
                    <button
                      className="admin-btn"
                      onClick={() => handleShowLogs(student.id, student.name)}
                      title="سجل النشاط"
                      style={{ flex: 1, justifyContent: 'center', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)', fontSize: '0.875rem', padding: '0.5rem' }}
                    >
                      <FiActivity />
                    </button>
                    {canBlock && (
                      <>
                        <button
                          className="admin-btn"
                          onClick={() => handleBlock(student.id, student.status)}
                          style={{ 
                            flex: 1, 
                            justifyContent: 'center', 
                            background: student.status !== 'blocked' ? 'var(--admin-danger-light)' : 'var(--admin-success-light)', 
                            color: student.status !== 'blocked' ? 'var(--admin-danger)' : 'var(--admin-success)', 
                            fontSize: '0.875rem', 
                            padding: '0.5rem' 
                          }}
                          title={student.status !== 'blocked' ? 'حظر' : 'تفعيل'}
                        >
                          {student.status !== 'blocked' ? <FiSlash /> : <FiCheck />}
                        </button>
                        
                        {student.is_email_blocked && (
                          <button
                            className="admin-btn"
                            onClick={() => handleUnblockEmail(student.email)}
                            title="فك حظر الإيميل"
                            style={{ 
                              flex: 1, 
                              justifyContent: 'center', 
                              background: 'rgba(59, 130, 246, 0.1)', 
                              color: '#3b82f6', 
                              fontSize: '0.875rem', 
                              padding: '0.5rem' 
                            }}
                          >
                            <FiMail />
                          </button>
                        )}

                        {(student.device_id || student.is_device_blocked) && (
                          <button
                            className="admin-btn"
                            onClick={() => handleUnblockDevice(student.device_id)}
                            title="إلغاء حظر الجهاز فقط"
                            style={{ flex: 1, justifyContent: 'center', background: 'var(--admin-gold-light)', color: 'var(--admin-gold)', fontSize: '0.875rem', padding: '0.5rem' }}
                          >
                            <FiUnlock />
                          </button>
                        )}

                        <button
                          className="admin-btn"
                          onClick={() => handleResetDevice(student.id)}
                          title="تصفير الجهاز"
                          style={{ flex: 1, justifyContent: 'center', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)', fontSize: '0.875rem', padding: '0.5rem' }}
                        >
                          <FiSmartphone />
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button
                        className="admin-btn"
                        onClick={() => handleDeleteStudent(student.id)}
                        title="حذف الطالب نهائياً"
                        style={{ flex: 1, justifyContent: 'center', background: 'var(--admin-danger-light)', color: 'var(--admin-danger)', fontSize: '0.875rem', padding: '0.5rem' }}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal for Logs */}
        {showLogsModal && (
          <div className="admin-modal-overlay">
            <div className="admin-modal" style={{ maxWidth: '800px' }}>
              <div className="admin-modal-header">
                <h2 className="admin-modal-title">سجل نشاط الطالب: {selectedStudentName}</h2>
                <button 
                  className="admin-close-btn"
                  onClick={() => setShowLogsModal(false)}
                >
                  <FiX />
                </button>
              </div>
              
              <div className="admin-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {logsLoading ? (
                  <div className="loading" style={{ color: 'var(--admin-primary)', textAlign: 'center' }}>جاري التحميل...</div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>التاريخ</th>
                          <th>النشاط</th>
                          <th>التفاصيل</th>
                          <th>IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudentLogs.length > 0 ? (
                          selectedStudentLogs.map((log) => (
                            <tr key={log.id}>
                              <td style={{ direction: 'ltr', textAlign: 'right' }}>{new Date(log.created_at).toLocaleString('ar-EG')}</td>
                              <td>
                                <span className="status-badge info">
                                  {translateAction(log.action)}
                                </span>
                              </td>
                              <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.875rem' }} title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}>
                                {renderDetails(log.details)}
                              </td>
                              <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>{log.ip_address || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>لا يوجد نشاط مسجل</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="admin-modal-footer">
                <button className="admin-btn admin-btn-secondary" onClick={() => setShowLogsModal(false)}>إغلاق</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Students;