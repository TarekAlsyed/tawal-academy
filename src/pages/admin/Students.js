import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiAward, FiSlash, FiCheck } from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/AdminPages.css';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const handleBlock = async (studentId, currentStatus) => {
    try {
      const action = currentStatus === 'active' ? 'block' : 'unblock';
      const response = await api.put(
        API_ENDPOINTS.ADMIN_STUDENT_BLOCK(studentId),
        { action }
      );

      if (response.data.success) {
        toast.success(currentStatus === 'active' ? 'تم حظر الطالب' : 'تم إلغاء الحظر');
        fetchStudents();
      }
    } catch (error) {
      toast.error('فشل تغيير حالة الطالب');
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

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <AdminLayout>
      <div className="admin-content">
        <div className="page-header">
          <h1>إدارة الطلبة</h1>
          <div className="header-actions">
            <button
              className="btn-primary"
              onClick={handleExport}
            >
              تصدير PDF
            </button>
          </div>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="ابحث بالاسم أو البريد الإلكتروني..."
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
              <option value="active">نشط</option>
              <option value="blocked">محظور</option>
            </select>
          </div>
        </div>

        <div className="students-grid">
          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              {searchTerm || statusFilter !== 'all' 
                ? 'لا توجد نتائج مطابقة' 
                : 'لا يوجد طلبة مسجلون'}
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className={`student-card ${student.status}`}>
                <div className="student-header">
                  <div className="student-avatar">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="student-info">
                    <h3>{student.name}</h3>
                    <p className="student-email">
                      <FiMail /> {student.email}
                    </p>
                    {student.phone && (
                      <p className="student-phone">
                        <FiPhone /> {student.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="student-stats">
                  <div className="stat-item">
                    <FiAward />
                    <span>النقاط: {student.total_points}</span>
                  </div>
                  <div className="stat-item">
                    <FiUser />
                    <span>الحالة: {student.status === 'active' ? 'نشط' : 'محظور'}</span>
                  </div>
                </div>

                <div className="student-actions">
                  <button
                    className={`btn-action ${student.status === 'active' ? 'danger' : 'success'}`}
                    onClick={() => handleBlock(student.id, student.status)}
                  >
                    {student.status === 'active' ? (
                      <>
                        <FiBan /> حظر
                      </>
                    ) : (
                      <>
                        <FiCheck /> تفعيل
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Students;