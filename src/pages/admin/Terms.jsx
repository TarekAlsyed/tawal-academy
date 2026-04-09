import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { FiPlus, FiEdit2, FiTrash2, FiLayers, FiEye, FiEyeOff } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';
// import '../../styles/AdminPages.css'; // Commented out to use COMPLETE-ADMIN-DESIGN.css

const Terms = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [formData, setFormData] = useState({ name: '', is_published: true });

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const response = await api.get(API_ENDPOINTS.ADMIN_TERMS);
      if (response.data.success) {
        setTerms(response.data.data.terms);
      }
    } catch (error) {
      toast.error('فشل تحميل الترمات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('اسم الترم مطلوب');
      return;
    }

    const loadingToast = toast.loading('جاري حفظ البيانات...');
    try {
      let response;
      if (editingTerm) {
        response = await api.put(API_ENDPOINTS.ADMIN_TERM_BY_ID(editingTerm.id), formData);
      } else {
        response = await api.post(API_ENDPOINTS.ADMIN_TERMS, formData);
      }
      
      if (response.data.success) {
        toast.update(loadingToast, {
          render: response.data.message || (editingTerm ? 'تم تحديث الترم بنجاح' : 'تم إضافة الترم بنجاح'),
          type: 'success',
          isLoading: false,
          autoClose: 2000
        });
        
        // إغلاق النافذة وتصفير البيانات فوراً
        setShowModal(false);
        setFormData({ name: '', is_published: true });
        setEditingTerm(null);
        
        // تحديث القائمة في الخلفية
        fetchTerms(true);
      } else {
        toast.update(loadingToast, {
          render: response.data.message || 'فشل حفظ البيانات',
          type: 'error',
          isLoading: false,
          autoClose: 3000
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.update(loadingToast, {
        render: error.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات',
        type: 'error',
        isLoading: false,
        autoClose: 3000
      });
    }
  };

  const handleEdit = (term) => {
    setEditingTerm(term);
    setFormData({ 
      name: term.name,
      is_published: term.is_published 
    });
    setShowModal(true);
  };

  const toggleVisibility = async (term) => {
    // 1. التحديث الفوري في الواجهة (Optimistic Update)
    const originalTerms = [...terms];
    const newStatus = !term.is_published;
    
    setTerms(prevTerms => prevTerms.map(t => 
      t.id === term.id ? { ...t, is_published: newStatus } : t
    ));

    try {
      const response = await api.put(API_ENDPOINTS.ADMIN_TERM_BY_ID(term.id), { 
        name: term.name,
        is_published: newStatus 
      });
      
      if (response.data.success) {
        toast.success(newStatus ? 'تم إظهار الترم بنجاح' : 'تم إخفاء الترم بنجاح', { 
          autoClose: 2000,
          hideProgressBar: true,
          position: "top-center"
        });
        // تحديث البيانات في الخلفية للتأكد من المزامنة
        fetchTerms(true);
      } else {
        // التراجع في حال الفشل
        setTerms(originalTerms);
        toast.error(response.data.message || 'فشل تحديث الحالة');
      }
    } catch (error) {
      // التراجع في حال الخطأ
      setTerms(originalTerms);
      console.error('Toggle visibility error:', error);
      toast.error(error.response?.data?.message || 'فشل تغيير حالة الظهور');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الترم؟')) return;

    const loadingToast = toast.loading('جاري حذف الترم...');
    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_TERM_BY_ID(id));
      if (response.data.success) {
        toast.update(loadingToast, {
          render: response.data.message || 'تم حذف الترم بنجاح',
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
        fetchTerms(true);
      } else {
        toast.update(loadingToast, {
          render: response.data.message || 'فشل حذف الترم',
          type: 'error',
          isLoading: false,
          autoClose: 3000
        });
      }
    } catch (error) {
      toast.update(loadingToast, {
        render: error.response?.data?.message || 'فشل حذف الترم',
        type: 'error',
        isLoading: false,
        autoClose: 3000
      });
    }
  };

  const openAddModal = () => {
    setEditingTerm(null);
    setFormData({ name: '', is_published: true });
    setShowModal(true);
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
          <h1>إدارة الترمات</h1>
          <p>إدارة الفصول الدراسية (الترمات) والمواد المرتبطة بها</p>
        </div>
        <div className="admin-header-actions">
          <button className="admin-btn admin-btn-primary" onClick={openAddModal}>
            <FiPlus /> إضافة ترم جديد
          </button>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>اسم الترم</th>
                  <th>الحالة</th>
                  <th>عدد المواد</th>
                  <th>تاريخ الإنشاء</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {terms.length > 0 ? (
                  terms.map((term, index) => (
                    <tr key={term.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FiLayers style={{ color: 'var(--admin-primary)' }} />
                          {term.name}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          background: term.is_published ? 'var(--admin-success-light)' : 'var(--admin-danger-light)', 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '15px', 
                          fontSize: '0.8rem',
                          color: term.is_published ? 'var(--admin-success)' : 'var(--admin-danger)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          {term.is_published ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                          {term.is_published ? 'منشور' : 'مخفي'}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          background: 'var(--admin-primary-light)', 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '15px', 
                          fontSize: '0.85rem',
                          color: 'var(--admin-primary)'
                        }}>
                          {term.subjects_count || 0} مادة
                        </span>
                      </td>
                      <td>{new Date(term.created_at).toLocaleDateString('ar-EG')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="admin-btn" 
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation(); 
                              toggleVisibility(term); 
                            }}
                            style={{ 
                              padding: '0.4rem', 
                              fontSize: '0.9rem',
                              background: term.is_published ? 'var(--admin-gold-light)' : 'var(--admin-success-light)',
                              color: term.is_published ? 'var(--admin-gold)' : 'var(--admin-success)',
                              cursor: 'pointer'
                            }}
                            title={term.is_published ? 'إخفاء عن الطلاب' : 'إظهار للطلاب'}
                          >
                            {term.is_published ? <FiEyeOff /> : <FiEye />}
                          </button>
                          <button 
                            className="admin-btn" 
                            onClick={() => handleEdit(term)}
                            style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                            title="تعديل"
                          >
                            <FiEdit2 />
                          </button>
                          <button 
                            className="admin-btn" 
                            onClick={() => handleDelete(term.id)}
                            style={{ padding: '0.4rem', fontSize: '0.9rem', background: 'var(--admin-danger-light)', color: 'var(--admin-danger)' }}
                            title="حذف"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)' }}>
                      لا توجد ترمات حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="admin-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>
              {editingTerm ? 'تعديل الترم' : 'إضافة ترم جديد'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--admin-text-muted)' }}>اسم الترم</label>
                <input
                  type="text"
                  className="admin-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: الترم الأول"
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--admin-bg-primary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.2rem' }}>حالة الظهور للطلاب</label>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                    {formData.is_published ? 'سيظهر الترم ومواده للطلاب' : 'سيتم إخفاء الترم ومواده عن الطلاب'}
                  </p>
                </div>
                <div 
                  onClick={() => setFormData({ ...formData, is_published: !formData.is_published })}
                  style={{ 
                    width: '50px', 
                    height: '26px', 
                    background: formData.is_published ? 'var(--admin-success)' : '#ccc', 
                    borderRadius: '13px', 
                    position: 'relative', 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    background: 'white', 
                    borderRadius: '50%', 
                    position: 'absolute', 
                    top: '3px', 
                    left: formData.is_published ? '27px' : '3px',
                    transition: 'all 0.3s ease'
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="admin-btn admin-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editingTerm ? 'تحديث' : 'إضافة'}
                </button>
                <button 
                  type="button" 
                  className="admin-btn" 
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, justifyContent: 'center', background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border)' }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Terms;
