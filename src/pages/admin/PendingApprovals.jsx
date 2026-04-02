import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiClock, FiCheckCircle, FiXCircle, FiUser, FiCalendar, FiEye } from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
// import '../../styles/AdminPages.css';

const PendingApprovals = () => {
  const [approvals, setApprovals] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending | approved | rejected | all
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const KEY_MAP = {
    'name': 'الاسم',
    'description': 'الوصف',
    'term_id': 'رقم الترم',
    'status': 'الحالة',
    'cover_image': 'صورة الغلاف',
    'question_text': 'نص السؤال',
    'correct_answer': 'الإجابة الصحيحة',
    'points': 'النقاط',
    'level': 'المستوى',
    'duration_minutes': 'المدة (دقيقة)',
    'passing_percentage': 'نسبة النجاح',
    'questions_count': 'عدد الأسئلة',
    'active': 'نشط',
    'type': 'النوع',
    'options': 'الخيارات',
    'updates': 'التعديلات',
    'pdfs': 'ملفات PDF',
    'images': 'الصور',
    'questions': 'الأسئلة',
    'id': 'المعرف',
    'created_at': 'تاريخ الإنشاء',
    'updated_at': 'تاريخ التحديث',
    'subject_id': 'معرف المادة',
    'exam_id': 'معرف الامتحان'
  };

  const translateKey = (key) => {
    return KEY_MAP[key] || key;
  };

  const renderDataRecursive = (data, level = 0) => {
    if (data === null || data === undefined) return <span style={{color: '#94a3b8'}}>-</span>;
    
    if (Array.isArray(data)) {
      if (data.length === 0) return <span style={{color: '#94a3b8'}}>فارغ</span>;
      return (
        <div style={{ paddingRight: '1rem', borderRight: '2px solid #e2e8f0', marginTop: '0.5rem' }}>
          {data.map((item, index) => (
            <div key={index} style={{ marginBottom: '0.5rem' }}>
              <strong style={{color: '#64748b'}}>عنصر {index + 1}:</strong>
              {renderDataRecursive(item, level + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof data === 'object') {
      return (
        <div style={{ paddingRight: level > 0 ? '1rem' : 0, borderRight: level > 0 ? '2px solid #e2e8f0' : 'none', marginTop: level > 0 ? '0.5rem' : 0 }}>
          {Object.entries(data).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 'bold', color: '#475569' }}>{translateKey(key)}:</span>
              <div style={{ marginRight: '0.5rem' }}>{renderDataRecursive(value, level + 1)}</div>
            </div>
          ))}
        </div>
      );
    }

    // Basic values
    if (typeof data === 'boolean') {
      return <span style={{ color: data ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{data ? 'نعم' : 'لا'}</span>;
    }

    return <span style={{ color: '#334155' }}>{String(data)}</span>;
  };

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `${API_ENDPOINTS.ADMIN_PENDING_APPROVALS}?status=${filter}`
      );
      if (response.data.success) {
        setApprovals(response.data.data.approvals || []);
        if (response.data.data.counts) {
          setCounts(response.data.data.counts);
        }
      }
    } catch (error) {
      toast.error('فشل تحميل الموافقات');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (approvalId) => {
    if (!window.confirm('هل أنت متأكد من الموافقة على هذا الطلب؟')) {
      return;
    }

    try {
      const response = await api.post(
        API_ENDPOINTS.ADMIN_APPROVE_REQUEST(approvalId)
      );

      if (response.data.success) {
        toast.success('✅ تمت الموافقة على الطلب بنجاح');
        fetchApprovals();
        setShowDetailsModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل الموافقة على الطلب');
    }
  };

  const handleReject = async (approvalId) => {
    if (!window.confirm('هل أنت متأكد من رفض هذا الطلب؟')) {
      return;
    }

    try {
      const response = await api.post(
        API_ENDPOINTS.ADMIN_REJECT_REQUEST(approvalId),
        { reason: rejectionReason.trim() || 'تم الرفض بواسطة المدير العام' }
      );

      if (response.data.success) {
        toast.success('❌ تم رفض الطلب');
        fetchApprovals();
        setShowDetailsModal(false);
        setRejectionReason('');
      } else {
        toast.error(response.data.message || 'فشل رفض الطلب');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error.response?.data?.message || 'فشل رفض الطلب');
    }
  };

  const handleDelete = async (approvalId) => {
    if (!window.confirm('⚠️ هل أنت متأكد من حذف هذا الطلب نهائياً من النظام؟ لا يمكن التراجع عن هذه الخطوة.')) {
      return;
    }

    try {
      const response = await api.delete(
        API_ENDPOINTS.ADMIN_DELETE_REQUEST(approvalId)
      );

      if (response.data.success) {
        toast.success('🗑️ تم حذف الطلب بنجاح');
        fetchApprovals();
        setShowDetailsModal(false);
      } else {
        toast.error(response.data.message || 'فشل حذف الطلب');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error(error.response?.data?.message || 'فشل حذف الطلب');
    }
  };

  const getActionLabel = (actionType) => {
    const labels = {
      add_subject: 'إضافة مادة',
      update_subject: 'تعديل مادة',
      delete_subject: 'حذف مادة',
      add_pdfs: 'إضافة ملفات PDF',
      add_images: 'إضافة صور',
      delete_image: 'حذف صورة',
      delete_pdf: 'حذف ملف PDF',
      delete_all_pdfs: 'حذف جميع ملفات PDF',
      delete_all_images: 'حذف جميع الصور',
      add_exam: 'إضافة امتحان',
      update_exam: 'تعديل امتحان',
      delete_exam: 'حذف امتحان',
      add_questions_manually: 'إضافة أسئلة يدوياً',
      update_question: 'تعديل سؤال',
      delete_question: 'حذف سؤال',
      add_questions_from_file: 'إضافة أسئلة من ملف',
      add_questions_from_text: 'إضافة أسئلة من نص'
    };
    return labels[actionType] || actionType;
  };

  const getActionIcon = (actionType) => {
    if (actionType.includes('subject')) return '📚';
    if (actionType.includes('exam')) return '📝';
    if (actionType.includes('pdf')) return '📄';
    if (actionType.includes('image')) return '🖼️';
    if (actionType.includes('question')) return '❓';
    return '⚙️';
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: '⏳ قيد الانتظار', color: 'var(--admin-gold)', bg: 'var(--admin-gold-light)' },
      approved: { label: '✅ تمت الموافقة', color: 'var(--admin-success)', bg: 'var(--admin-success-light)' },
      rejected: { label: '❌ مرفوض', color: 'var(--admin-danger)', bg: 'var(--admin-danger-light)' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span style={{ 
        padding: '0.25rem 0.75rem', 
        borderRadius: '20px', 
        fontSize: '0.85rem',
        background: badge.bg,
        color: badge.color,
        border: `1px solid ${badge.bg}`,
        fontWeight: 'bold'
      }}>
        {badge.label}
      </span>
    );
  };

  const handleViewDetails = (approval) => {
    setSelectedApproval(approval);
    setShowDetailsModal(true);
    setRejectionReason('');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="loading" style={{ color: 'var(--admin-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>جاري التحميل...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>الموافقات المعلقة</h1>
          <p>مراجعة والموافقة على طلبات المديرين</p>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-tabs" style={{ 
          marginBottom: '2rem', 
          background: 'rgba(255,255,255,0.03)', 
          padding: '0.5rem', 
          borderRadius: '12px',
          display: 'flex',
          gap: '0.5rem',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <button
            className={`admin-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
            style={{ 
              flex: 1,
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              transition: 'all 0.3s ease',
              background: filter === 'pending' ? 'var(--admin-primary)' : 'transparent',
              color: filter === 'pending' ? 'white' : 'var(--admin-text-secondary)',
              border: 'none',
              fontWeight: filter === 'pending' ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>⏳ المعلقة</span>
            <span style={{ 
              background: filter === 'pending' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', 
              padding: '2px 8px', 
              borderRadius: '12px',
              fontSize: '0.8rem'
            }}>
              {counts.pending}
            </span>
          </button>
          
          <button
            className={`admin-tab ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
            style={{ 
              flex: 1,
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              transition: 'all 0.3s ease',
              background: filter === 'approved' ? 'var(--admin-success)' : 'transparent',
              color: filter === 'approved' ? 'white' : 'var(--admin-text-secondary)',
              border: 'none',
              fontWeight: filter === 'approved' ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>✅ الموافق عليها</span>
            <span style={{ 
              background: filter === 'approved' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', 
              padding: '2px 8px', 
              borderRadius: '12px',
              fontSize: '0.8rem'
            }}>
              {counts.approved}
            </span>
          </button>

          <button
            className={`admin-tab ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
            style={{ 
              flex: 1,
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              transition: 'all 0.3s ease',
              background: filter === 'rejected' ? 'var(--admin-danger)' : 'transparent',
              color: filter === 'rejected' ? 'white' : 'var(--admin-text-secondary)',
              border: 'none',
              fontWeight: filter === 'rejected' ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>❌ المرفوضة</span>
            <span style={{ 
              background: filter === 'rejected' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', 
              padding: '2px 8px', 
              borderRadius: '12px',
              fontSize: '0.8rem'
            }}>
              {counts.rejected}
            </span>
          </button>

          <button
            className={`admin-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            style={{ 
              flex: 1,
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              transition: 'all 0.3s ease',
              background: filter === 'all' ? 'var(--admin-text-secondary)' : 'transparent',
              color: filter === 'all' ? 'white' : 'var(--admin-text-secondary)',
              border: 'none',
              fontWeight: filter === 'all' ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>📋 الكل</span>
            <span style={{ 
              background: filter === 'all' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', 
              padding: '2px 8px', 
              borderRadius: '12px',
              fontSize: '0.8rem'
            }}>
              {counts.all}
            </span>
          </button>
        </div>

        <div>
          {(approvals || []).length === 0 ? (
            <div className="admin-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
              <FiClock size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <h3>لا توجد طلبات</h3>
              <p>
                {filter === 'pending' 
                  ? 'لا توجد طلبات معلقة حالياً' 
                  : 'لا توجد طلبات في هذا القسم'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {(approvals || []).map((approval) => (
                <div key={approval.id} className="admin-card" style={{ 
                  borderLeft: approval.status === 'pending' ? '4px solid #f59e0b' : 
                              approval.status === 'approved' ? '4px solid #10b981' : '4px solid #ef4444',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div className="admin-card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h3 className="admin-card-title" style={{ fontSize: '1.1rem' }}>
                      {getActionIcon(approval.action_type)} {getActionLabel(approval.action_type)}
                    </h3>
                    {getStatusBadge(approval.status)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiUser />
                        <span><strong>المدير:</strong> {approval.admin_name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiCalendar />
                        <span><strong>التاريخ:</strong> {new Date(approval.created_at).toLocaleString('ar-EG')}</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--admin-primary)' }}>البيانات المطلوبة:</strong>
                      {approval.action_type.includes('subject') && (
                        <div>
                          {approval.entity_data.name && <p>📚 اسم المادة: {approval.entity_data.name}</p>}
                          {approval.entity_data.updates?.name && <p>📚 الاسم الجديد: {approval.entity_data.updates.name}</p>}
                          {approval.entity_data.description && (
                            <p>📝 الوصف: {approval.entity_data.description}</p>
                          )}
                        </div>
                      )}
                      {approval.action_type.includes('exam') && (
                        <div>
                          {approval.entity_data.name && <p>📝 اسم الامتحان: {approval.entity_data.name}</p>}
                          {approval.entity_data.updates?.name && <p>� الاسم الجديد: {approval.entity_data.updates.name}</p>}
                          {approval.entity_data.level && <p>�📊 المستوى: {approval.entity_data.level}</p>}
                        </div>
                      )}
                      {approval.action_type === 'add_pdfs' && (
                        <div>
                          <p>📄 عدد الملفات: {approval.entity_data.pdfs?.length}</p>
                          <p>📂 أسماء الملفات: {approval.entity_data.pdfs?.map(p => p.name).join(', ')}</p>
                        </div>
                      )}
                      {approval.action_type === 'add_images' && (
                        <div>
                          <p>🖼️ عدد الصور: {approval.entity_data.images?.length}</p>
                        </div>
                      )}
                      {approval.action_type === 'delete_image' && (
                        <div>
                          <p>🖼️ حذف صورة ID: {approval.entity_data.imageId}</p>
                        </div>
                      )}
                      {approval.action_type === 'delete_pdf' && (
                        <div>
                          <p>📄 حذف ملف PDF ID: {approval.entity_data.pdfId}</p>
                        </div>
                      )}
                      {approval.action_type === 'delete_all_pdfs' && (
                        <div>
                          <p>📂 حذف جميع ملفات PDF للمادة ID: {approval.entity_data.id}</p>
                        </div>
                      )}
                      {approval.action_type === 'delete_all_images' && (
                        <div>
                          <p>🖼️ حذف جميع الصور للمادة ID: {approval.entity_data.id}</p>
                        </div>
                      )}
                      {approval.action_type === 'delete_subject' && (
                        <div>
                          <p>📚 حذف المادة ID: {approval.entity_data.id}</p>
                        </div>
                      )}
                      {approval.action_type === 'delete_exam' && (
                        <div>
                          <p>📝 حذف الامتحان ID: {approval.entity_data.id}</p>
                        </div>
                      )}
                      {approval.action_type === 'delete_question' && (
                        <div>
                          <p>❓ حذف السؤال ID: {approval.entity_data.questionId}</p>
                        </div>
                      )}
                      {approval.action_type === 'update_question' && (
                        <div>
                          <p>❓ تعديل السؤال ID: {approval.entity_data.questionId}</p>
                          {approval.entity_data.updates?.question_text && (
                            <p>📝 النص الجديد: {approval.entity_data.updates.question_text}</p>
                          )}
                        </div>
                      )}
                      {(approval.action_type === 'add_questions_manually' || 
                        approval.action_type === 'add_questions_from_file' || 
                        approval.action_type === 'add_questions_from_text') && (
                        <div>
                          <p>❓ عدد الأسئلة: {approval.entity_data.questions?.length}</p>
                        </div>
                      )}
                    </div>

                    {approval.status === 'rejected' && (approval.rejection_reason || approval.review_notes) && (
                      <div style={{ background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <strong style={{ color: '#ef4444' }}>سبب الرفض:</strong>
                        <p style={{ margin: 0, color: 'var(--admin-text)' }}>{approval.rejection_reason || approval.review_notes}</p>
                      </div>
                    )}

                    {approval.status === 'approved' && approval.reviewed_by_name && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>
                        <small>
                          ✅ تمت الموافقة بواسطة: {approval.reviewed_by_name}
                          {' '}في {new Date(approval.reviewed_at).toLocaleString('ar-EG')}
                        </small>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border)' }}>
                    {approval.status === 'pending' ? (
                      <>
                        <button
                          className="admin-btn"
                          onClick={() => handleApprove(approval.id)}
                          style={{ flex: 1.5, justifyContent: 'center', background: 'var(--admin-success)', color: 'white' }}
                        >
                          <FiCheckCircle /> موافقة
                        </button>
                        <button
                          className="admin-btn"
                          onClick={() => handleViewDetails(approval)}
                          style={{ flex: 1, justifyContent: 'center', background: 'var(--admin-danger-light)', color: 'var(--admin-danger)' }}
                        >
                          <FiXCircle /> رفض
                        </button>
                      </>
                    ) : null}

                    <button
                      className="admin-btn"
                      onClick={() => handleViewDetails(approval)}
                      style={{ 
                        flex: approval.status === 'pending' ? 1 : 2, 
                        justifyContent: 'center', 
                        background: 'var(--admin-bg-primary)', 
                        border: '1px solid var(--admin-border)' 
                      }}
                    >
                      <FiEye /> التفاصيل
                    </button>

                    <button
                      className="admin-btn"
                      onClick={() => handleDelete(approval.id)}
                      style={{ 
                        width: '40px',
                        minWidth: '40px',
                        justifyContent: 'center', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '0'
                      }}
                      title="حذف الطلب نهائياً"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Details */}
        {showDetailsModal && selectedApproval && (
          <div className="admin-modal-overlay">
            <div className="admin-modal" style={{ maxWidth: '800px' }}>
              <div className="admin-modal-header">
                <h2 className="admin-modal-title">تفاصيل الطلب</h2>
                <button className="admin-close-btn" onClick={() => setShowDetailsModal(false)}>
                  <FiXCircle />
                </button>
              </div>

              <div className="admin-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <strong style={{ color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>نوع العملية:</strong>
                    <span style={{ fontSize: '1.1rem' }}>{getActionLabel(selectedApproval.action_type)}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>المدير:</strong>
                    <span style={{ fontSize: '1.1rem' }}>{selectedApproval.admin_name}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>التاريخ:</strong>
                    <span style={{ fontSize: '1.1rem' }}>{new Date(selectedApproval.created_at).toLocaleString('ar-EG')}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>الحالة:</strong>
                    {getStatusBadge(selectedApproval.status)}
                  </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--admin-primary)' }}>البيانات الكاملة:</h3>
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '1.5rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--admin-border)',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {renderDataRecursive(selectedApproval.entity_data)}
                  </div>
                </div>

                {selectedApproval.status === 'pending' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="admin-label">
                      سبب الرفض (اختياري):
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="اكتب سبب الرفض لإبلاغ المدير..."
                      className="admin-input"
                      rows="3"
                    />
                  </div>
                )}
              </div>

              <div className="admin-modal-footer" style={{ justifyContent: 'flex-start', gap: '0.75rem' }}>
                {selectedApproval.status === 'pending' && (
                  <>
                    <button
                      className="admin-btn admin-btn-success"
                      onClick={() => handleApprove(selectedApproval.id)}
                      style={{ flex: 1.5, background: 'var(--admin-success)', color: 'white' }}
                    >
                      <FiCheckCircle /> موافقة
                    </button>
                    <button
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleReject(selectedApproval.id)}
                      style={{ flex: 1 }}
                    >
                      <FiXCircle /> رفض
                    </button>
                  </>
                )}
                
                <button 
                  className="admin-btn admin-btn-secondary" 
                  onClick={() => setShowDetailsModal(false)}
                  style={{ flex: selectedApproval.status === 'pending' ? 1 : 2 }}
                >
                  إغلاق
                </button>
                
                <button
                  className="admin-btn"
                  onClick={() => handleDelete(selectedApproval.id)}
                  style={{ 
                    width: '45px',
                    minWidth: '45px',
                    background: 'rgba(239, 68, 68, 0.1)', 
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    padding: '0',
                    justifyContent: 'center'
                  }}
                  title="حذف نهائي"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PendingApprovals;