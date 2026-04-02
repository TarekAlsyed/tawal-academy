import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { FiPlus, FiEdit2, FiTrash2, FiLayers } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';
// import '../../styles/AdminPages.css'; // Commented out to use COMPLETE-ADMIN-DESIGN.css

const Terms = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_TERMS);
      if (response.data.success) {
        setTerms(response.data.data.terms);
      }
    } catch (error) {
      toast.error('فشل تحميل الترمات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('اسم الترم مطلوب');
      return;
    }

    try {
      if (editingTerm) {
        await api.put(API_ENDPOINTS.ADMIN_TERM_BY_ID(editingTerm.id), formData);
        toast.success('تم تحديث الترم بنجاح');
      } else {
        await api.post(API_ENDPOINTS.ADMIN_TERMS, formData);
        toast.success('تم إضافة الترم بنجاح');
      }
      
      setShowModal(false);
      setFormData({ name: '' });
      setEditingTerm(null);
      fetchTerms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleEdit = (term) => {
    setEditingTerm(term);
    setFormData({ name: term.name });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الترم؟')) return;

    try {
      await api.delete(API_ENDPOINTS.ADMIN_TERM_BY_ID(id));
      toast.success('تم حذف الترم بنجاح');
      fetchTerms();
    } catch (error) {
      toast.error('فشل حذف الترم');
    }
  };

  const openAddModal = () => {
    setEditingTerm(null);
    setFormData({ name: '' });
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
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)' }}>
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
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="مثال: الترم الأول"
                  required
                  style={{ width: '100%' }}
                />
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
