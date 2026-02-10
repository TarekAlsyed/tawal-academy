import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { FiUpload, FiTrash2, FiPlus } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/AdminPages.css';

const SubjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pdfs');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSubject();
  }, [id]);

  const fetchSubject = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.SUBJECT_BY_ID(id));
      if (response.data.success) {
        setSubject(response.data.data.subject);
      }
    } catch (error) {
      toast.error('فشل تحميل المادة');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPDFs = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('pdfs', files[i]);
    }

    setUploading(true);
    try {
      await api.post(API_ENDPOINTS.ADMIN_UPLOAD_PDFS(id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`تم رفع ${files.length} ملف بنجاح`);
      fetchSubject();
    } catch (error) {
      toast.error('فشل رفع الملفات');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImages = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    setUploading(true);
    try {
      await api.post(API_ENDPOINTS.ADMIN_UPLOAD_IMAGES(id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`تم رفع ${files.length} صورة بنجاح`);
      fetchSubject();
    } catch (error) {
      toast.error('فشل رفع الصور');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePDF = async (pdfId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف؟')) return;

    try {
      await api.delete(API_ENDPOINTS.ADMIN_DELETE_PDF(id, pdfId));
      toast.success('تم حذف الملف بنجاح');
      fetchSubject();
    } catch (error) {
      toast.error('فشل حذف الملف');
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الصورة؟')) return;

    try {
      await api.delete(API_ENDPOINTS.ADMIN_DELETE_IMAGE(id, imageId));
      toast.success('تم حذف الصورة بنجاح');
      fetchSubject();
    } catch (error) {
      toast.error('فشل حذف الصورة');
    }
  };

  if (loading) return <AdminLayout><div className="loading">جاري التحميل...</div></AdminLayout>;
  if (!subject) return <AdminLayout><div>المادة غير موجودة</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1>{subject.name}</h1>
          <p>{subject.term_name}</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/admin/subjects')}>
          رجوع للمواد
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pdfs' ? 'active' : ''}`}
          onClick={() => setActiveTab('pdfs')}
        >
          ملفات PDF ({subject.pdfs?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          الصور ({subject.images?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          الامتحانات ({subject.exams?.length || 0})
        </button>
      </div>

      <div className="content-card">
        {activeTab === 'pdfs' && (
          <div>
            <div className="upload-section">
              <label className="btn-upload">
                <FiUpload /> {uploading ? 'جاري الرفع...' : 'رفع ملفات PDF'}
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleUploadPDFs}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              <small>يمكنك رفع عدة ملفات في وقت واحد</small>
            </div>

            {subject.pdfs && subject.pdfs.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم الملف</th>
                    <th>عدد التحميلات</th>
                    <th>تاريخ الرفع</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {subject.pdfs.map((pdf) => (
                    <tr key={pdf.id}>
                      <td>{pdf.title}</td>
                      <td>{pdf.downloads_count}</td>
                      <td>{new Date(pdf.created_at).toLocaleDateString('ar-EG')}</td>
                      <td>
                        <button
                          className="btn-icon delete"
                          onClick={() => handleDeletePDF(pdf.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">لا توجد ملفات PDF</div>
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div>
            <div className="upload-section">
              <label className="btn-upload">
                <FiUpload /> {uploading ? 'جاري الرفع...' : 'رفع صور'}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleUploadImages}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              <small>يمكنك رفع عدة صور في وقت واحد</small>
            </div>

            {subject.images && subject.images.length > 0 ? (
              <div className="images-grid">
                {subject.images.map((image) => (
                  <div key={image.id} className="image-card">
                    <img src={image.file_url} alt={image.title} />
                    <div className="image-overlay">
                      <p>{image.title}</p>
                      <button
                        className="btn-icon delete"
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">لا توجد صور</div>
            )}
          </div>
        )}

        {activeTab === 'exams' && (
          <div>
            <button
              className="btn-primary"
              onClick={() => navigate(`/admin/subjects/${id}/exams/add`)}
            >
              <FiPlus /> إضافة امتحان جديد
            </button>

            {subject.exams && subject.exams.length > 0 ? (
              <div className="exams-list">
                {subject.exams.map((exam) => (
                  <div key={exam.id} className="exam-card">
                    <div>
                      <h3>
                        {exam.name} - المستوى {exam.level}
                      </h3>
                      <p>{exam.questions_count} سؤال</p>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => navigate(`/admin/exams/${exam.id}`)}
                    >
                      إدارة الأسئلة
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">لا توجد امتحانات</div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default SubjectDetail;