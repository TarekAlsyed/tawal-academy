import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiHome, FiBook, FiUsers, FiHelpCircle, FiLogOut, FiCalendar, FiShield, FiCheckCircle, FiActivity, FiAlertTriangle, FiList, FiDatabase } from 'react-icons/fi';
// import '../../styles/AdminPages.css';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, adminLogout } = useAuth();

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: <FiHome />, label: 'الإحصائيات', permission: 'stats' },
    { path: '/admin/security', icon: <FiShield />, label: 'مركز العمليات الأمنية (SOC)', permission: 'stats' },
    { path: '/admin/activity-logs', icon: <FiActivity />, label: 'سجل التدقيق', permission: 'stats' },
    { path: '/admin/terms', icon: <FiCalendar />, label: 'الترمات', permission: 'subjects' },
    { path: '/admin/subjects', icon: <FiBook />, label: 'المواد', permission: 'subjects' },
    { path: '/admin/question-bank', icon: <FiDatabase />, label: 'بنك الأسئلة المركزي', permission: 'questions' },
    { path: '/admin/exam-attempts', icon: <FiList />, label: 'نتائج الطلاب', permission: 'exams' },
    { path: '/admin/violations', icon: <FiAlertTriangle />, label: 'سجل المخالفات', permission: 'exams' },
    { path: '/admin/students', icon: <FiUsers />, label: 'الطلبة', permission: 'students' },
    { path: '/admin/student-questions', icon: <FiHelpCircle />, label: 'أسئلة الطلبة', permission: 'questions' },
    { path: '/admin/admins', icon: <FiShield />, label: 'إدارة المديرين', superOnly: true },
    { path: '/admin/approvals', icon: <FiCheckCircle />, label: 'الموافقات المعلقة', permission: 'approvals' }
  ];

  const checkItemPermission = (item) => {
    // 1. إذا لم يكن هناك أدمن مسجل، لا تظهر شيئاً
    if (!admin) return false;
    
    // 2. فحص صارم للمدير العام (Super Admin)
    const isSuper = admin.is_super_admin === true || admin.isSuperAdmin === true;
    
    // إذا كان مديراً عاماً، تظهر له كل الصفحات
    if (isSuper) return true;
    
    // 3. للمديرين العاديين
    if (item.superOnly) return false;
    
    if (!item.permission) return true;

    let detailedPermissions = {};
    try {
      detailedPermissions = typeof admin.permissions_detailed === 'string'
        ? JSON.parse(admin.permissions_detailed)
        : admin.permissions_detailed || {};
    } catch (e) {
      detailedPermissions = {};
    }

    if (detailedPermissions[item.permission]?.view) return true;

    const oldPermissions = admin.permissions || {};
    if (oldPermissions[item.permission]) return true;

    return false;
  };

  const handleItemClick = (item) => {
    if (item.path === '/admin/admins') {
      console.log('Navigating to admins page directly');
      window.location.hash = '#/admin/admins';
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <div className="admin-logo-box">
            <div className="admin-logo-icon">🎓</div>
            <div className="admin-logo-text">
              <h2>Tawal Academy</h2>
              <p>لوحة التحكم</p>
            </div>
          </div>
        </div>

        <nav className="admin-menu">
          {menuItems.filter(checkItemPermission).map((item) => (
            <a
              key={item.path}
              href={`#${item.path}`}
              className={`admin-menu-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={(e) => { 
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                  // Allow default behavior for new tab/window
                  return;
                }
                e.preventDefault(); 
                handleItemClick(item); 
              }}
            >
              <span className="admin-menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="admin-user-section">
          <div className="admin-user-card">
            <div className="admin-avatar">
              {admin?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="admin-user-info">
              <h4>{admin?.name}</h4>
              <span className="admin-user-role">{admin?.role || 'مسؤول'}</span>
            </div>
          </div>
          <button className="admin-logout" onClick={handleLogout}>
            <FiLogOut />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
