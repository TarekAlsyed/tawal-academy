import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS, getFileUrl } from '../../config/api';
import { FiUpload, FiTrash2, FiPlus, FiLock, FiUnlock, FiAlertTriangle, FiFileText, FiImage, FiBook, FiArrowRight, FiEdit2 } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
// import '../../styles/AdminPages.css';

const SubjectDetail = () => {
  const { admin } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pdfs');
  const [uploading, setUploading] = useState(false);
  const [hasWatermark, setHasWatermark] = useState(true);

  // التحقق من الصلاحيات التفصيلية (دعم القيم المنطقية والنصية للأمان)
  const isSuper = admin?.is_super_admin === true || admin?.is_super_admin === 'true';
  
  const getPermission = (section, action) => {
      if (isSuper) return true;
      const perm = admin?.permissions_detailed?.[section]?.[action];
      if (perm === true) return true;
      if (typeof perm === 'object' && perm !== null) return perm.allowed === true;
      return false;
  };

  const canDelete = getPermission('subjects', 'delete');
  const canAdd = getPermission('subjects', 'add');
  const canUploadPDF = getPermission('subjects', 'upload_pdf');
  const canDeletePDF = getPermission('subjects', 'delete_pdf');
  const canUploadImage = getPermission('subjects', 'upload_image');
  const canDeleteImage = getPermission('subjects', 'delete_image');

  const fetchSubject = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_SUBJECT_BY_ID(id));
      if (response.data.success) {
        setSubject(response.data.data.subject);
      }
    } catch (error) {
      toast.error('فشل تحميل المادة');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSubject();
  }, [fetchSubject]);

  const handleUploadPDFs = async (e) => {
    if (!canUploadPDF) return toast.error('لا تملك صلاحية رفع الملفات');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE = 500 * 1024 * 1024; // 500MB limit for Cloudinary (Elite size)
    const formData = new FormData();
    
    // Use the native File objects directly to ensure compatibility
    const fileList = Array.from(files);
    for (const file of fileList) {
      if (file.size > MAX_SIZE) {
        return toast.error(`الملف "${file.name}" حجمه كبير جداً. الحد الأقصى هو 500 ميجابايت.`);
      }
      formData.append('pdfs', file);
    }
    formData.append('has_watermark', hasWatermark);

    setUploading(true);
    try {
      await api.post(API_ENDPOINTS.ADMIN_UPLOAD_PDFS(id), formData);
      toast.success(`تم رفع ${files.length} ملف بنجاح`);
      fetchSubject();
    } catch (error) {
      console.error('[UPLOAD ERROR]:', error);
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        const errorMsg = error.response?.data?.message || 'فشل رفع الملفات';
        toast.error(errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImages = async (e) => {
    if (!canUploadImage) return toast.error('لا تملك صلاحية رفع الصور');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB limit
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_SIZE) {
        return toast.error(`الصورة "${files[i].name}" حجمها كبير جداً. الحد الأقصى هو 100 ميجابايت.`);
      }
      formData.append('images', files[i]);
    }

    setUploading(true);
    try {
      await api.post(API_ENDPOINTS.ADMIN_UPLOAD_IMAGES(id), formData);
      toast.success(`تم رفع ${files.length} صورة بنجاح`);
      fetchSubject();
    } catch (error) {
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        toast.error('فشل رفع الصور');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePDF = async (pdfId) => {
    if (!canDeletePDF) return toast.error('لا تملك صلاحية حذف الملفات');
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف؟')) return;

    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_DELETE_PDF(id, pdfId));
      if (response.data.success) {
        toast.success('تم حذف الملف بنجاح');
        fetchSubject();
      }
    } catch (error) {
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        toast.error('فشل حذف الملف');
      }
    }
  };

  const handleToggleWatermark = async (pdfId, currentStatus) => {
    if (!canUploadPDF) return toast.error('لا تملك صلاحية تعديل الملفات');
    try {
      const response = await api.put(API_ENDPOINTS.ADMIN_UPDATE_PDF_WATERMARK(id, pdfId), {
        has_watermark: !currentStatus
      });
      if (response.data.success) {
        toast.success('تم تحديث حالة العلامة المائية');
        fetchSubject();
      }
    } catch (error) {
      toast.error('فشل تحديث العلامة المائية');
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!canDeleteImage) return toast.error('لا تملك صلاحية حذف الصور');
    if (!window.confirm('هل أنت متأكد من حذف هذه الصورة؟')) return;

    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_DELETE_IMAGE(id, imageId));
      if (response.data.success) {
        toast.success('تم حذف الصورة بنجاح');
        fetchSubject();
      }
    } catch (error) {
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        toast.error('فشل حذف الصورة');
      }
    }
  };

  const handleDeleteAllPDFs = async () => {
    if (!canDeletePDF) return toast.error('لا تملك صلاحية حذف الملفات');
    if (!window.confirm('تحذير: هل أنت متأكد من حذف جميع ملفات الـ PDF في هذه المادة؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_DELETE_ALL_PDFS(id));
      if (response.data.success) {
        toast.success('تم حذف جميع ملفات الـ PDF بنجاح');
        fetchSubject();
      }
    } catch (error) {
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        toast.error('فشل حذف الملفات');
      }
    }
  };

  const handleDeleteAllImages = async () => {
    if (!canDeleteImage) return toast.error('لا تملك صلاحية حذف الصور');
    if (!window.confirm('تحذير: هل أنت متأكد من حذف جميع الصور في هذه المادة؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_DELETE_ALL_IMAGES(id));
      if (response.data.success) {
        toast.success('تم حذف جميع الصور بنجاح');
        fetchSubject();
      }
    } catch (error) {
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        toast.error('فشل حذف الصور');
      }
    }
  };

  const handleDeleteAllExams = async () => {
    if (!canDelete) return toast.error('لا تملك صلاحية الحذف');
    if (!window.confirm('تحذير شديد: هل أنت متأكد من حذف جميع الامتحانات في هذه المادة؟ سيتم حذف جميع الأسئلة والنتائج المرتبطة بها نهائياً!')) return;

    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_DELETE_ALL_EXAMS(id));
      if (response.data.success) {
        toast.success('تم حذف جميع الامتحانات بنجاح');
        fetchSubject();
      }
    } catch (error) {
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        toast.error('فشل حذف الامتحانات');
      }
    }
  };

  const handleToggleExamStatus = async (examId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'open' ? 'closed' : 'open';
      const updateResponse = await api.put(`/admin/exams/${examId}`, { status: newStatus });
      
      if (updateResponse.data.success) {
        toast.success(newStatus === 'open' ? 'تم فتح الامتحان بنجاح' : 'تم قفل الامتحان بنجاح');
        fetchSubject();
      }
    } catch (error) {
      if (error.response?.status !== 403 && error.response?.status !== 202) {
        toast.error('فشل تغيير حالة الامتحان');
      }
    }
  };

  if (loading) return <AdminLayout><div className="loading" style={{ color: 'var(--admin-primary)', textAlign: 'center', marginTop: '2rem', fontSize: '1.2rem', fontWeight: 'bold' }}>جاري التحميل...</div></AdminLayout>;
  if (!subject) return <AdminLayout><div style={{ color: 'var(--admin-text)', textAlign: 'center', marginTop: '2rem' }}>المادة غير موجودة</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-container">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>{subject.name}</h1>
            <p>{subject.term_name}</p>
          </div>
          <div className="admin-header-actions">
            <button 
              className="admin-btn admin-btn-secondary" 
              onClick={() => navigate('/admin/subjects')}
            >
              <FiArrowRight /> رجوع للمواد
            </button>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <button
              className={`admin-btn ${activeTab === 'pdfs' ? 'active' : ''}`}
              onClick={() => setActiveTab('pdfs')}
              style={{ 
                background: activeTab === 'pdfs' ? 'var(--admin-primary)' : '#f1f5f9',
                border: activeTab === 'pdfs' ? '1px solid var(--admin-primary)' : '1px solid var(--admin-border)',
                color: activeTab === 'pdfs' ? 'white' : 'var(--admin-text)',
                justifyContent: 'center',
                flex: 1,
                minWidth: '150px',
                boxShadow: activeTab === 'pdfs' ? 'var(--admin-shadow)' : 'none'
              }}
            >
              <FiFileText />
              <span>ملفات PDF</span>
              <span style={{ 
                background: activeTab === 'pdfs' ? '#6366f1' : '#e2e8f0', 
                color: activeTab === 'pdfs' ? 'white' : 'var(--admin-text)',
                padding: '0.1rem 0.5rem', 
                borderRadius: '8px', 
                fontSize: '0.75rem',
                marginLeft: '0.5rem',
                fontWeight: 'bold'
              }}>{subject.pdfs?.length || 0}</span>
            </button>
            
            <button
              className={`admin-btn ${activeTab === 'images' ? 'active' : ''}`}
              onClick={() => setActiveTab('images')}
              style={{ 
                background: activeTab === 'images' ? 'var(--admin-primary)' : '#f1f5f9',
                border: activeTab === 'images' ? '1px solid var(--admin-primary)' : '1px solid var(--admin-border)',
                color: activeTab === 'images' ? 'white' : 'var(--admin-text)',
                justifyContent: 'center',
                flex: 1,
                minWidth: '150px',
                boxShadow: activeTab === 'images' ? 'var(--admin-shadow)' : 'none'
              }}
            >
              <FiImage />
              <span>الصور</span>
              <span style={{ 
                background: activeTab === 'images' ? '#6366f1' : '#e2e8f0', 
                color: activeTab === 'images' ? 'white' : 'var(--admin-text)',
                padding: '0.1rem 0.5rem', 
                borderRadius: '8px', 
                fontSize: '0.75rem',
                marginLeft: '0.5rem',
                fontWeight: 'bold'
              }}>{subject.images?.length || 0}</span>
            </button>
            
            <button
              className={`admin-btn ${activeTab === 'exams' ? 'active' : ''}`}
              onClick={() => setActiveTab('exams')}
              style={{ 
                background: activeTab === 'exams' ? 'var(--admin-primary)' : '#f1f5f9',
                border: activeTab === 'exams' ? '1px solid var(--admin-primary)' : '1px solid var(--admin-border)',
                color: activeTab === 'exams' ? 'white' : 'var(--admin-text)',
                justifyContent: 'center',
                flex: 1,
                minWidth: '150px',
                boxShadow: activeTab === 'exams' ? 'var(--admin-shadow)' : 'none'
              }}
            >
              <FiBook />
              <span>الامتحانات</span>
              <span style={{ 
                background: activeTab === 'exams' ? '#6366f1' : '#e2e8f0', 
                color: activeTab === 'exams' ? 'white' : 'var(--admin-text)',
                padding: '0.1rem 0.5rem', 
                borderRadius: '8px', 
                fontSize: '0.75rem',
                marginLeft: '0.5rem',
                fontWeight: 'bold'
              }}>{subject.exams?.length || 0}</span>
            </button>
          </div>

          <div className="admin-card">
            {activeTab === 'pdfs' && (
              <>
                <div className="admin-card-header">
                  <h2 className="admin-card-title">إدارة ملفات PDF</h2>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {canUploadPDF && (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: 'var(--admin-text)',
                          background: '#f8fafc',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid var(--admin-border)',
                          userSelect: 'none'
                        }}>
                          <input
                            type="checkbox"
                            checked={hasWatermark}
                            onChange={(e) => setHasWatermark(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span>تطبيق علامة مائية</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="file"
                            multiple
                            accept=".pdf"
                            onChange={handleUploadPDFs}
                            disabled={uploading}
                            style={{ 
                              position: 'absolute', 
                              inset: 0, 
                              opacity: 0, 
                              cursor: 'pointer',
                              zIndex: 2
                            }}
                          />
                          <button className="admin-btn admin-btn-primary" disabled={uploading}>
                            <FiUpload /> {uploading ? 'جاري الرفع...' : 'رفع ملفات PDF'}
                          </button>
                        </div>
                      </div>
                    )}
                    {canDeletePDF && subject.pdfs?.length > 0 && (
                      <button 
                        className="admin-btn admin-btn-danger" 
                        onClick={handleDeleteAllPDFs}
                        style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                      >
                        <FiTrash2 /> حذف الكل
                      </button>
                    )}
                  </div>
                </div>

                {subject.pdfs && subject.pdfs.length > 0 ? (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>اسم الملف</th>
                          <th>الحجم</th>
                          <th>التحميلات</th>
                          <th>العلامة المائية</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subject.pdfs.map((pdf) => (
                          <tr key={pdf.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  background: 'rgba(239,68,68,0.1)', 
                                  borderRadius: '6px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  color: '#ef4444'
                                }}>
                                  <FiFileText />
                                </div>
                                <a 
                                  href={getFileUrl(pdf.file_url, pdf.has_watermark)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: '600' }}
                                >
                                  {pdf.title}
                                </a>
                              </div>
                            </td>
                            <td>{(pdf.file_size / (1024 * 1024)).toFixed(2)} MB</td>
                            <td>{pdf.downloads_count} تحميل</td>
                            <td>
                              <label style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: pdf.has_watermark ? '#059669' : '#64748b',
                                background: pdf.has_watermark ? '#ecfdf5' : '#f8fafc',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: `1px solid ${pdf.has_watermark ? '#d1fae5' : '#e2e8f0'}`,
                                width: 'fit-content',
                                userSelect: 'none'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={pdf.has_watermark}
                                  onChange={() => handleToggleWatermark(pdf.id, pdf.has_watermark)}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span>{pdf.has_watermark ? 'مفعلة' : 'معطلة'}</span>
                              </label>
                            </td>
                            <td>
                              {canDeletePDF && (
                                <button
                                  className="admin-btn"
                                  onClick={() => handleDeletePDF(pdf.id)}
                                  style={{ background: '#fef2f2', color: '#ef4444', padding: '0.5rem', border: '1px solid #fee2e2' }}
                                  title="حذف"
                                >
                                  <FiTrash2 />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                    <FiFileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <h3>لا توجد ملفات PDF</h3>
                    <p>قم برفع ملفات جديدة لتظهر هنا</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'images' && (
              <>
                <div className="admin-card-header">
                  <h2 className="admin-card-title">إدارة الصور</h2>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {canUploadImage && (
                      <div style={{ position: 'relative' }}>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleUploadImages}
                          disabled={uploading}
                          style={{ 
                            position: 'absolute', 
                            inset: 0, 
                            opacity: 0, 
                            cursor: 'pointer',
                            zIndex: 2
                          }}
                        />
                        <button className="admin-btn admin-btn-primary" disabled={uploading}>
                          <FiUpload /> {uploading ? 'جاري الرفع...' : 'رفع صور'}
                        </button>
                      </div>
                    )}
                    {canDeleteImage && subject.images?.length > 0 && (
                      <button 
                        className="admin-btn admin-btn-danger" 
                        onClick={handleDeleteAllImages}
                        style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                      >
                        <FiTrash2 /> حذف الكل
                      </button>
                    )}
                  </div>
                </div>

                {subject.images && subject.images.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    {subject.images.map((image) => (
                      <div key={image.id} style={{ 
                        background: 'white', 
                        borderRadius: '12px', 
                        overflow: 'hidden',
                        position: 'relative',
                        border: '1px solid var(--admin-border)',
                        boxShadow: 'var(--admin-shadow-sm)'
                      }}>
                        <div style={{ height: '150px', overflow: 'hidden' }}>
                          <img 
                            src={getFileUrl(image.file_url)} 
                            alt={subject.name ? `صورة ${subject.name}` : "صورة توضيحية"} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)' }}>
                            {image.views_count} مشاهدة
                          </span>
                          {canDeleteImage && (
                              <button
                                onClick={() => handleDeleteImage(image.id)}
                                style={{ 
                                  background: '#fef2f2', 
                                  color: '#ef4444', 
                                  border: '1px solid #fee2e2',
                                  borderRadius: '8px', 
                                  width: '32px', 
                                  height: '32px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s'
                                }}
                                title="حذف"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                    <FiImage size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <h3>لا توجد صور</h3>
                    <p>قم برفع صور جديدة لتظهر هنا</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'exams' && (
              <>
                <div className="admin-card-header">
                  <h2 className="admin-card-title">إدارة الامتحانات</h2>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {canAdd && (
                      <button 
                        className="admin-btn admin-btn-primary" 
                        onClick={() => navigate(`/admin/exams/add/${id}`)}
                      >
                        <FiPlus /> إضافة امتحان
                      </button>
                    )}
                    {canDelete && subject.exams?.length > 0 && (
                      <button 
                        className="admin-btn admin-btn-danger" 
                        onClick={handleDeleteAllExams}
                        style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                      >
                        <FiTrash2 /> حذف الكل
                      </button>
                    )}
                  </div>
                </div>

                {subject.exams && subject.exams.length > 0 ? (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>اسم الامتحان</th>
                          <th>المستوى</th>
                          <th>عدد الأسئلة</th>
                          <th>الحالة</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subject.exams.map((exam) => (
                          <tr key={exam.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  background: 'rgba(245,158,11,0.1)', 
                                  borderRadius: '8px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  color: '#f59e0b'
                                }}>
                                  <FiBook />
                                </div>
                                <span style={{ fontWeight: '600', color: '#1e293b' }}>{exam.name}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '20px', 
                                background: 'rgba(255,255,255,0.05)', 
                                fontSize: '0.875rem' 
                              }}>
                                المستوى {exam.level}
                              </span>
                            </td>
                            <td>{exam.questions_count} سؤال</td>
                            <td>
                              <button
                                onClick={() => handleToggleExamStatus(exam.id, exam.status)}
                                style={{
                                  background: exam.status === 'open' ? '#ecfdf5' : '#fef2f2',
                                  color: exam.status === 'open' ? '#059669' : '#dc2626',
                                  border: `1px solid ${exam.status === 'open' ? '#d1fae5' : '#fee2e2'}`,
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '20px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}
                              >
                                {exam.status === 'open' ? <><FiUnlock size={14} /> مفتوح</> : <><FiLock size={14} /> مغلق</>}
                              </button>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="admin-btn"
                                  onClick={() => navigate(`/admin/exams/edit/${exam.id}`)}
                                  style={{ background: '#fffbeb', color: '#d97706', padding: '0.5rem', border: '1px solid #fef3c7' }}
                                  title="تعديل الامتحان"
                                >
                                  <FiEdit2 size={16} />
                                </button>
                                <button
                                  className="admin-btn"
                                  onClick={() => navigate(`/admin/manage-questions/${exam.id}`)}
                                  style={{ background: '#ecfeff', color: '#0891b2', padding: '0.5rem', border: '1px solid #cffafe' }}
                                  title="إدارة الأسئلة"
                                >
                                  <FiFileText />
                                </button>
                                {canDelete && (
                                  <button
                                    className="admin-btn"
                                    onClick={() => {
                                      if (window.confirm('هل أنت متأكد من حذف هذا الامتحان؟')) {
                                        api.delete(`/admin/exams/${exam.id}`).then(() => {
                                          toast.success('تم الحذف بنجاح');
                                          fetchSubject();
                                        });
                                      }
                                    }}
                                    style={{ background: '#fef2f2', color: '#dc2626', padding: '0.5rem', border: '1px solid #fee2e2' }}
                                    title="حذف"
                                  >
                                    <FiTrash2 />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                    <FiAlertTriangle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <h3>لا توجد امتحانات</h3>
                    <p>قم بإضافة امتحانات جديدة لتظهر هنا</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubjectDetail;
