import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiMessageSquare, FiCheck, FiX, FiSearch, FiFilter, FiMessageCircle } from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
// import '../../styles/AdminPages.css'; // Commented out to use COMPLETE-ADMIN-DESIGN.css

const StudentQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_QUESTIONS);
      if (response.data.success) {
        setQuestions(response.data.data.questions);
      }
    } catch (error) {
      toast.error('فشل تحميل أسئلة الطلبة');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (questionId) => {
    if (!replyText.trim()) {
      toast.error('يرجى كتابة رد');
      return;
    }

    try {
      const response = await api.post(
        API_ENDPOINTS.ADMIN_REPLY_QUESTION(questionId),
        { reply: replyText }
      );

      if (response.data.success) {
        toast.success('تم الرد بنجاح');
        setReplyingTo(null);
        setReplyText('');
        fetchQuestions();
      }
    } catch (error) {
      toast.error('فشل إرسال الرد');
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

    try {
      const response = await api.delete(
        API_ENDPOINTS.ADMIN_DELETE_STUDENT_QUESTION(questionId)
      );

      if (response.data.success) {
        toast.success('تم حذف السؤال');
        fetchQuestions();
      }
    } catch (error) {
      toast.error('فشل حذف السؤال');
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = 
      question.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.question.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || question.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="loading" style={{ color: 'var(--admin-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>جاري التحميل...</div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>أسئلة الطلبة</h1>
          <p>إدارة أسئلة الطلبة والرد عليها</p>
        </div>
      </header>

      <div className="admin-content">
        {/* Filters */}
        <div className="admin-card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
              <input
                type="text"
                className="admin-input"
                placeholder="ابحث بالاسم أو نص السؤال..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingRight: '2.5rem', width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
              <FiFilter style={{ color: 'var(--admin-text-muted)' }} />
              <select
                className="admin-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="answered">تم الرد</option>
              </select>
            </div>
          </div>
        </div>

        {/* Questions Grid */}
        <div className="admin-grid">
          {filteredQuestions.length === 0 ? (
            <div className="admin-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <FiMessageCircle size={48} style={{ color: 'var(--admin-text-muted)', marginBottom: '1rem' }} />
              <h3>لا توجد أسئلة</h3>
              <p style={{ color: 'var(--admin-text-muted)' }}>
                {searchTerm || statusFilter !== 'all' 
                  ? 'لا توجد نتائج مطابقة لبحثك' 
                  : 'لا توجد أسئلة جديدة من الطلاب'}
              </p>
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <div key={question.id} className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: 'var(--admin-primary-light)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      color: 'var(--admin-primary)'
                    }}>
                      <FiUser />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{question.student.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                        <FiMail size={12} />
                        <span>{question.student.email}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`status-badge ${question.status === 'pending' ? 'warning' : 'success'}`}>
                    {question.status === 'pending' ? 'قيد الانتظار' : 'تم الرد'}
                  </span>
                </div>

                <div style={{ 
                  background: 'var(--admin-bg-primary)', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  marginBottom: '1rem',
                  flex: 1,
                  border: '1px solid var(--admin-border)'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <FiMessageSquare style={{ marginTop: '0.25rem', color: 'var(--admin-primary)' }} />
                    <p style={{ margin: 0, lineHeight: '1.5', color: 'var(--admin-text)' }}>{question.question}</p>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.5rem', textAlign: 'left' }}>
                    {new Date(question.created_at).toLocaleDateString('ar-EG')}
                  </div>
                </div>

                {question.reply && (
                  <div style={{ 
                    background: 'var(--admin-success-light)', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    borderRight: '3px solid var(--admin-success)'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--admin-success)' }}>الرد:</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--admin-text-muted)' }}>{question.reply}</p>
                    <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.75rem' }}>
                      تم الرد: {new Date(question.replied_at).toLocaleDateString('ar-EG')}
                    </small>
                  </div>
                )}

                {replyingTo === question.id ? (
                  <div style={{ marginTop: '1rem', animation: 'fadeIn 0.3s ease' }}>
                    <textarea
                      className="admin-input"
                      rows="3"
                      placeholder="اكتب ردك هنا..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                      autoFocus
                    ></textarea>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="admin-btn admin-btn-primary" 
                        onClick={() => handleReply(question.id)}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <FiCheck /> إرسال
                      </button>
                      <button 
                        className="admin-btn admin-btn-secondary" 
                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="question-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    {question.status === 'pending' ? (
                      <button
                        className="admin-btn admin-btn-primary"
                        onClick={() => { setReplyingTo(question.id); setReplyText(''); }}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <FiCheck /> رد
                      </button>
                    ) : null}
                    <button
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleDelete(question.id)}
                      style={{ 
                        flex: 1, 
                        justifyContent: 'center'
                      }}
                    >
                      <FiX /> حذف
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentQuestions;
