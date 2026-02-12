import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiMessageSquare, FiCheck, FiX } from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/AdminPages.css';

const StudentQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_STUDENT_QUESTIONS);
      if (response.data.success) {
        setQuestions(response.data.data.questions);
      }
    } catch (error) {
      toast.error('فشل تحميل أسئلة الطلبة');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (questionId, reply) => {
    if (!reply.trim()) {
      toast.error('يرجى كتابة رد');
      return;
    }

    try {
      const response = await api.post(
        API_ENDPOINTS.ADMIN_REPLY_QUESTION(questionId),
        { reply }
      );

      if (response.data.success) {
        toast.success('تم الرد بنجاح');
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

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <AdminLayout>
      <div className="admin-content">
        <div className="page-header">
          <h1>أسئلة الطلبة</h1>
          <p>إدارة أسئلة الطلبة والرد عليها</p>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="ابحث بالاسم أو نص السؤال..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>الحالة:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="pending">قيد الانتظار</option>
              <option value="answered">تم الرد</option>
            </select>
          </div>
        </div>

        <div className="questions-list">
          {filteredQuestions.length === 0 ? (
            <div className="empty-state">
              {searchTerm || statusFilter !== 'all' 
                ? 'لا توجد نتائج مطابقة' 
                : 'لا توجد أسئلة جديدة'}
            </div>
          ) : (
            <div className="questions-grid">
              {filteredQuestions.map((question) => (
                <div key={question.id} className={`question-card ${question.status}`}>
                  <div className="question-header">
                    <div className="student-info">
                      <FiUser />
                      <span>{question.student.name}</span>
                    </div>
                    <div className="student-email">
                      <FiMail />
                      <span>{question.student.email}</span>
                    </div>
                    <span className={`status-badge ${question.status}`}>
                      {question.status === 'pending' ? 'قيد الانتظار' : 'تم الرد'}
                    </span>
                  </div>

                  <div className="question-content">
                    <div className="question-text">
                      <FiMessageSquare />
                      <p>{question.question}</p>
                    </div>

                    {question.reply && (
                      <div className="reply-section">
                        <h4>الرد:</h4>
                        <p>{question.reply}</p>
                        <small>تم الرد بتاريخ: {new Date(question.replied_at).toLocaleDateString('ar-SA')}</small>
                      </div>
                    )}
                  </div>

                  <div className="question-actions">
                    {question.status === 'pending' && (
                      <>
                        <button
                          className="btn-reply"
                          onClick={() => {
                            const reply = prompt('اكتب ردك:');
                            if (reply) handleReply(question.id, reply);
                          }}
                        >
                          <FiCheck /> رد
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(question.id)}
                        >
                          <FiX /> حذف
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentQuestions;