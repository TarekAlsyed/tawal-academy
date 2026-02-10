import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/AdminPages.css';

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

  if (loading) return <AdminLayout><div className="loading">جاري التحميل...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1>إدارة الترمات</h1>
        <button className="btn-primary" onClick={openAddModal}>
          <FiPlus /> إضافة ترم جديد
        </button>
      </div>

      <div className="content-card">
        <table className="data-table">
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
                  <td>{term.name}</td>
                  <td>{term.subjects_count || 0}</td>
                  <td>{new Date(term.created_at).toLocaleDateString('ar-EG')}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon edit" onClick={() => handleEdit(term)}>
                        <FiEdit2 />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(term.id)}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>لا توجد ترمات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTerm ? 'تعديل الترم' : 'إضافة ترم جديد'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>اسم الترم</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="مثال: الترم الأول"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  {editingTerm ? 'تحديث' : 'إضافة'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
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
