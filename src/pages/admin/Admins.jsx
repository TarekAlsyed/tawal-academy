import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUserPlus, FiEdit2, FiTrash2, FiShield, FiLock, FiActivity, FiX } from 'react-icons/fi';
import api, { adminGetActivityLogs } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
// import '../../styles/AdminPages.css'; // Commented out to use COMPLETE-ADMIN-DESIGN.css

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    isSuperAdmin: false
  });
  
  // Logs Modal State
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedAdminLogs, setSelectedAdminLogs] = useState([]);
  const [selectedAdminName, setSelectedAdminName] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  // صلاحيات متقدمة
  const initialPermissions = {
    subjects: {
      view: { allowed: true, requireApproval: false },
      add: { allowed: true, requireApproval: false },
      edit: { allowed: false, requireApproval: false },
      delete: { allowed: false, requireApproval: false },
      upload_pdf: { allowed: true, requireApproval: false },
      delete_pdf: { allowed: false, requireApproval: false },
      upload_image: { allowed: true, requireApproval: false },
      delete_image: { allowed: false, requireApproval: false },
    },
    exams: {
      view: { allowed: true, requireApproval: false },
      add: { allowed: true, requireApproval: false },
      edit: { allowed: false, requireApproval: false },
      delete: { allowed: false, requireApproval: false },
    },
    students: {
      view: { allowed: true, requireApproval: false },
      view_count: { allowed: true, requireApproval: false },
      add: { allowed: false, requireApproval: false },
      edit: { allowed: false, requireApproval: false },
      delete: { allowed: false, requireApproval: false },
      block: { allowed: true, requireApproval: false },
      unblock: { allowed: true, requireApproval: false }
    },
    questions: {
      view: { allowed: true, requireApproval: false },
      reply: { allowed: true, requireApproval: false },
      delete: { allowed: false, requireApproval: false }
    },
    stats: {
      view: { allowed: true, requireApproval: false }
    },
    admins: {
      view: { allowed: false, requireApproval: false },
      add: { allowed: false, requireApproval: false },
      edit: { allowed: false, requireApproval: false },
      delete: { allowed: false, requireApproval: false }
    },
    approvals: {
      view: { allowed: true, requireApproval: false },
      approve: { allowed: false, requireApproval: false },
      reject: { allowed: false, requireApproval: false }
    }
  };

  const [advancedPermissions, setAdvancedPermissions] = useState(initialPermissions);

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

  const translateAction = (action) => {
    return ACTION_MAP[action] || action;
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

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_GET_ALL_ADMINS);
      if (response.data.success) {
        setAdmins(response.data.data.admins);
      }
    } catch (error) {
      toast.error('فشل تحميل قائمة المديرين');
    } finally {
      setLoading(false);
    }
  };

  const handleShowLogs = async (adminId, adminName) => {
    setSelectedAdminName(adminName);
    setShowLogsModal(true);
    setLogsLoading(true);
    try {
      const response = await adminGetActivityLogs({ adminId });
      if (response.data.success) {
        setSelectedAdminLogs(response.data.data.logs);
      }
    } catch (error) {
      toast.error('فشل تحميل سجل النشاط');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAdvancedPermissionChange = (section, permission, field = 'allowed') => {
    setAdvancedPermissions(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [permission]: {
          ...prev[section][permission],
          [field]: !prev[section][permission][field]
        }
      }
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      isSuperAdmin: false
    });
    setAdvancedPermissions(initialPermissions);
    setSelectedAdmin(null);
    setShowModal(false);
    setShowPermissionsModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('الاسم والبريد الإلكتروني مطلوبان');
      return;
    }

    if (!formData.email.includes('@')) {
      toast.error('البريد الإلكتروني غير صحيح');
      return;
    }

    if (!selectedAdmin) {
      if (!formData.password || formData.password.length < 6) {
        toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error('كلمات المرور غير متطابقة');
        return;
      }
    }

    try {
      const data = {
        name: formData.name,
        email: formData.email,
        permissionsDetailed: formData.isSuperAdmin ? {} : advancedPermissions,
        is_super_admin: formData.isSuperAdmin
      };

      if (!selectedAdmin) {
        data.password = formData.password;
      }

      let response;
      if (selectedAdmin) {
        response = await api.put(
          API_ENDPOINTS.ADMIN_UPDATE_ADMIN(selectedAdmin.id),
          data
        );
      } else {
        response = await api.post(API_ENDPOINTS.ADMIN_CREATE_ADMIN, data);
      }

      if (response.data.success) {
        toast.success(
          selectedAdmin ? 'تم تحديث المدير بنجاح' : 'تم إضافة المدير بنجاح'
        );
        resetForm();
        fetchAdmins();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل حفظ بيانات المدير');
    }
  };

  const handleDelete = async (adminId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المدير؟')) return;

    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_DELETE_ADMIN(adminId));
      if (response.data.success) {
        toast.success('تم حذف المدير بنجاح');
        fetchAdmins();
      }
    } catch (error) {
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        toast.error('فشل حذف المدير');
      }
    }
  };

  const handleEdit = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      confirmPassword: '',
      isSuperAdmin: admin.is_super_admin
    });
    
    // Parse permissions if they exist
    if (admin.permissions_detailed && !admin.is_super_admin) {
      const mergedPermissions = JSON.parse(JSON.stringify(initialPermissions));
      
      Object.keys(admin.permissions_detailed).forEach(section => {
        if (mergedPermissions[section]) {
          Object.keys(admin.permissions_detailed[section]).forEach(perm => {
             const val = admin.permissions_detailed[section][perm];
             if (typeof val === 'boolean') {
                 if (mergedPermissions[section][perm]) {
                    mergedPermissions[section][perm].allowed = val;
                 }
             } else if (typeof val === 'object') {
                 mergedPermissions[section][perm] = { ...mergedPermissions[section][perm], ...val };
             }
          });
        }
      });
      
      setAdvancedPermissions(mergedPermissions);
    } else {
        setAdvancedPermissions(initialPermissions);
    }
    
    setShowModal(true);
  };

  const handleEditPermissions = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      confirmPassword: '',
      isSuperAdmin: admin.is_super_admin
    });
    
    // Parse permissions if they exist
    if (admin.permissions_detailed && !admin.is_super_admin) {
      const mergedPermissions = JSON.parse(JSON.stringify(initialPermissions));
      
      Object.keys(admin.permissions_detailed).forEach(section => {
        if (mergedPermissions[section]) {
          Object.keys(admin.permissions_detailed[section]).forEach(perm => {
             const val = admin.permissions_detailed[section][perm];
             if (typeof val === 'boolean') {
                 if (mergedPermissions[section][perm]) {
                    mergedPermissions[section][perm].allowed = val;
                 }
             } else if (typeof val === 'object') {
                 mergedPermissions[section][perm] = { ...mergedPermissions[section][perm], ...val };
             }
          });
        }
      });
      
      setAdvancedPermissions(mergedPermissions);
    } else {
        setAdvancedPermissions(initialPermissions);
    }
    setShowPermissionsModal(true);
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="loading" style={{ color: 'var(--admin-primary)' }}>جاري التحميل...</div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>إدارة المشرفين</h1>
          <p>إدارة حسابات المشرفين وصلاحياتهم</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => { resetForm(); setShowModal(true); }}
          >
            <FiUserPlus /> إضافة مشرف جديد
          </button>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {admins.map((admin) => (
            <div key={admin.id} className="admin-card">
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="admin-avatar">
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--admin-text)' }}>{admin.name}</h3>
                      <p style={{ margin: 0, color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>{admin.email}</p>
                    </div>
                  </div>
                  {admin.is_super_admin && (
                    <span className="status-badge warning">
                      <FiShield size={12} /> مشرف عام
                    </span>
                  )}
                </div>

                <div style={{ padding: '1rem', background: 'var(--admin-bg-primary)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>
                    <span>تاريخ الانضمام:</span>
                    <span>{new Date(admin.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--admin-text-muted)' }}>
                    <span>آخر ظهور:</span>
                    <span>{admin.last_login ? new Date(admin.last_login).toLocaleDateString('ar-EG') : 'لم يسجل دخول'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="admin-btn" 
                    onClick={() => handleShowLogs(admin.id, admin.name)}
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)' }}
                    title="سجل النشاط"
                  >
                    <FiActivity />
                  </button>
                  <button 
                    className="admin-btn" 
                    onClick={() => handleEditPermissions(admin)}
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)' }}
                    title="الصلاحيات"
                    disabled={admin.is_super_admin}
                  >
                    <FiLock />
                  </button>
                  <button 
                    className="admin-btn" 
                    onClick={() => handleEdit(admin)}
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem', background: 'var(--admin-bg-primary)', color: 'var(--admin-text-muted)' }}
                    title="تعديل"
                  >
                    <FiEdit2 />
                  </button>
                  <button 
                    className="admin-btn" 
                    onClick={() => handleDelete(admin.id)}
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem', background: 'var(--admin-danger-light)', color: 'var(--admin-danger)' }}
                    title="حذف"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {selectedAdmin ? 'تعديل بيانات المشرف' : 'إضافة مشرف جديد'}
              </h2>
              <button className="admin-close-btn" onClick={() => setShowModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-label">الاسم</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="admin-input"
                    placeholder="اسم المشرف"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-label">البريد الإلكتروني</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="admin-input"
                    placeholder="example@tawal.com"
                  />
                </div>
                
                {!selectedAdmin && (
                  <>
                    <div className="admin-form-group">
                      <label className="admin-label">كلمة المرور</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="admin-input"
                        placeholder="******"
                      />
                    </div>
                    
                    <div className="admin-form-group">
                      <label className="admin-label">تأكيد كلمة المرور</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="admin-input"
                        placeholder="******"
                      />
                    </div>
                  </>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                  <input
                    type="checkbox"
                    name="isSuperAdmin"
                    checked={formData.isSuperAdmin}
                    onChange={handleChange}
                    id="isSuperAdmin"
                    style={{ width: '18px', height: '18px', accentColor: 'var(--admin-primary)' }}
                  />
                  <label htmlFor="isSuperAdmin" style={{ cursor: 'pointer', color: 'var(--admin-text)', fontWeight: '500' }}>مشرف عام (كامل الصلاحيات)</label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button 
                  type="button" 
                  className="admin-btn admin-btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  إلغاء
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  {selectedAdmin ? 'حفظ التعديلات' : 'إضافة المشرف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '800px' }}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                تعديل صلاحيات: {selectedAdmin?.name}
              </h2>
              <button className="admin-close-btn" onClick={() => setShowPermissionsModal(false)}>
                <FiX />
              </button>
            </div>
            
            <div className="admin-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {[
                    { id: 'subjects', label: 'المواد الدراسية', perms: [
                        { key: 'view', label: 'عرض المواد' },
                        { key: 'add', label: 'إضافة مواد' },
                        { key: 'edit', label: 'تعديل مواد' },
                        { key: 'delete', label: 'حذف مواد' },
                        { key: 'upload_pdf', label: 'رفع ملفات PDF' },
                        { key: 'delete_pdf', label: 'حذف ملفات PDF' },
                        { key: 'upload_image', label: 'رفع صور' },
                        { key: 'delete_image', label: 'حذف صور' }
                    ]},
                    { id: 'exams', label: 'الامتحانات', perms: [
                        { key: 'view', label: 'عرض الامتحانات' },
                        { key: 'add', label: 'إضافة امتحانات' },
                        { key: 'edit', label: 'تعديل امتحانات' },
                        { key: 'delete', label: 'حذف امتحانات' }
                    ]},
                    { id: 'students', label: 'الطلاب', perms: [
                        { key: 'view', label: 'دخول صفحة الطلاب' },
                        { key: 'view_count', label: 'عرض عدد الطلاب' },
                        { key: 'add', label: 'إضافة طلاب' },
                        { key: 'edit', label: 'تعديل بيانات طلاب' },
                        { key: 'delete', label: 'حذف طلاب' },
                        { key: 'block', label: 'حظر طلاب' },
                        { key: 'unblock', label: 'إلغاء حظر' }
                    ]},
                    { id: 'questions', label: 'الأسئلة', perms: [
                        { key: 'view', label: 'عرض الأسئلة' },
                        { key: 'reply', label: 'الرد على الأسئلة' },
                        { key: 'delete', label: 'حذف أسئلة' }
                    ]},
                    { id: 'stats', label: 'الإحصائيات', perms: [
                        { key: 'view', label: 'عرض الإحصائيات' }
                    ]},
                    { id: 'admins', label: 'إدارة المشرفين', perms: [
                        { key: 'view', label: 'عرض المشرفين' },
                        { key: 'add', label: 'إضافة مشرفين' },
                        { key: 'edit', label: 'تعديل مشرفين' },
                        { key: 'delete', label: 'حذف مشرفين' }
                    ]},
                    { id: 'approvals', label: 'نظام الموافقات', perms: [
                        { key: 'view', label: 'عرض الطلبات المعلقة' },
                        { key: 'approve', label: 'الموافقة على الطلبات' },
                        { key: 'reject', label: 'رفض الطلبات' }
                    ]}
                ].map(section => (
                    <div key={section.id} style={{ background: 'var(--admin-bg-primary)', padding: '1rem', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--admin-primary)' }}>{section.label}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {section.perms.map(perm => {
                                const pData = advancedPermissions[section.id]?.[perm.key] || { allowed: false, requireApproval: false };
                                return (
                                    <div key={perm.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                                            <input 
                                                type="checkbox" 
                                                checked={pData.allowed} 
                                                onChange={() => handleAdvancedPermissionChange(section.id, perm.key, 'allowed')}
                                                style={{ accentColor: 'var(--admin-primary)' }}
                                            /> 
                                            <span style={{ fontSize: '0.9rem' }}>{perm.label}</span>
                                        </label>
                                        
                                        {pData.allowed && (
                                            <label 
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.25rem', 
                                                    fontSize: '0.8rem', 
                                                    color: pData.requireApproval ? '#f59e0b' : '#9ca3af', 
                                                    cursor: 'pointer',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: pData.requireApproval ? '#fffbeb' : 'transparent',
                                                    border: pData.requireApproval ? '1px solid #fcd34d' : '1px solid transparent'
                                                }} 
                                                title="تفعيل الموافقة المسبقة من المدير العام"
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={pData.requireApproval} 
                                                    onChange={() => handleAdvancedPermissionChange(section.id, perm.key, 'requireApproval')}
                                                    style={{ width: '14px', height: '14px', accentColor: '#f59e0b' }}
                                                /> 
                                                <FiShield size={12} /> <span style={{ whiteSpace: 'nowrap' }}>يتطلب موافقة</span>
                                            </label>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
              </div>

              <div className="admin-modal-footer">
                <button 
                  type="button" 
                  className="admin-btn admin-btn-secondary" 
                  onClick={() => setShowPermissionsModal(false)}
                >
                  إغلاق
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    handleSubmit({ preventDefault: () => {} }); // Reuse submit logic
                  }} 
                  className="admin-btn admin-btn-primary" 
                >
                  حفظ الصلاحيات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Modal */}
      {showLogsModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '800px' }}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                سجل نشاط: {selectedAdminName}
              </h2>
              <button className="admin-close-btn" onClick={() => setShowLogsModal(false)}>
                <FiX />
              </button>
            </div>
            
            <div className="admin-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {logsLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: '2rem' }}>جاري التحميل...</div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>النشاط</th>
                        <th>التفاصيل</th>
                        <th>التاريخ</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAdminLogs.length > 0 ? (
                        selectedAdminLogs.map((log) => (
                          <tr key={log.id}>
                            <td>
                              <span className="status-badge info">
                                {translateAction(log.action)}
                              </span>
                            </td>
                            <td title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details} style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {renderDetails(log.details)}
                            </td>
                            <td style={{ direction: 'ltr', textAlign: 'right' }}>{new Date(log.created_at).toLocaleString('ar-EG')}</td>
                            <td>{log.ip_address || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)' }}>
                            لا يوجد سجل نشاط
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="admin-modal-footer">
              <button 
                className="admin-btn admin-btn-secondary" 
                onClick={() => setShowLogsModal(false)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Admins;