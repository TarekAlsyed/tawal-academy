const pool = require('../config/database');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const FormData = require('form-data');

// 1. List all pending approvals
exports.listPendingApprovals = async (req, res, next) => {
    try {
        const { status } = req.query;
        
        // Get counts for each status
        const countsQuery = `
            SELECT 
                COUNT(*) as all_count,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
            FROM pending_approvals
        `;
        const countsResult = await pool.query(countsQuery);
        const counts = countsResult.rows[0];

        let query = `
            SELECT p.*, a.name as admin_name 
            FROM pending_approvals p
            JOIN admins a ON p.admin_id = a.id
        `;
        const values = [];

        if (status && status !== 'all') {
            query += ' WHERE p.status = $1';
            values.push(status);
        }

        query += ' ORDER BY p.created_at DESC';

        const result = await pool.query(query, values);

        // Map results to include names from JSON data if join fails or to ensure consistency
        const processedRows = result.rows.map(row => {
            const data = row.entity_data || {};
            return {
                ...row,
                admin_name: row.admin_name || data.admin_name || 'مدير غير معروف'
            };
        });

        res.json({ 
            success: true, 
            data: { 
                approvals: processedRows,
                counts: {
                    all: parseInt(counts.all_count),
                    pending: parseInt(counts.pending_count),
                    approved: parseInt(counts.approved_count),
                    rejected: parseInt(counts.rejected_count)
                }
            } 
        });
    } catch (error) {
        next(error);
    }
};

// 2. Approve Request (Execute it)
exports.approveRequest = async (req, res, next) => {
    const { id } = req.params;
    
    try {
        // Fetch the pending request
        const requestResult = await pool.query('SELECT * FROM pending_approvals WHERE id = $1', [id]);
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        const pendingRequest = requestResult.rows[0];
        
        if (pendingRequest.status !== 'pending') {
             return res.status(400).json({ success: false, message: 'تمت معالجة هذا الطلب مسبقاً' });
        }

        const requestData = pendingRequest.entity_data || pendingRequest.request_data; 

        // Generate a fresh token for the current super admin (who is approving)
        // This ensures the executed action has Super Admin privileges (bypassing the approval check)
        const token = jwt.sign(
            { adminId: req.admin.id, is_system_execution: true },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const PORT = process.env.PORT || 5000;
        // استخدام 127.0.0.1 بدلاً من localhost لضمان الوصول في بيئات Docker/Fly.io
        const BASE_URL = process.env.INTERNAL_API_URL || `http://127.0.0.1:${PORT}`; 

        let config = {
            method: requestData.method,
            url: `${BASE_URL}${requestData.url}`,
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: requestData.body
        };

        const originalFiles = [];

        // Handle File Uploads (Multiple or Single)
        const hasFiles = (requestData.files && requestData.files.length > 0) || requestData.file;

        if (hasFiles) {
             const form = new FormData();
             
             // Append body fields
             for (const key in requestData.body) {
                 const value = requestData.body[key];
                 if (typeof value === 'object') {
                     form.append(key, JSON.stringify(value));
                 } else {
                     form.append(key, String(value));
                 }
            }

            // Append files (array)
            if (requestData.files) {
                for (const file of requestData.files) {
                    if (fs.existsSync(file.path)) {
                        form.append(file.fieldname, fs.createReadStream(file.path), { filename: file.originalname });
                        originalFiles.push(file.path);
                    }
                }
            }

            // Append file (single)
            if (requestData.file && fs.existsSync(requestData.file.path)) {
                const file = requestData.file;
                form.append(file.fieldname, fs.createReadStream(file.path), { filename: file.originalname });
                originalFiles.push(file.path);
            }
            
            config.data = form;
            config.headers = {
                ...config.headers,
                ...form.getHeaders()
            };
            // Remove application/json to avoid conflict with multipart/form-data
            if (config.headers['Content-Type']) delete config.headers['Content-Type'];
        } else {
            // Ensure headers are correct for JSON request
            config.headers['Content-Type'] = 'application/json';
        }

        // Execute the request
        try {
            await axios(config);

            // If successful, update status
            await pool.query(
                "UPDATE pending_approvals SET status = 'approved', reviewed_by = $1, rejection_reason = NULL, reviewed_at = CURRENT_TIMESTAMP WHERE id = $2", 
                [req.admin.id, id]
            );

            // Clean up original files
            for (const filePath of originalFiles) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            res.json({ success: true, message: 'تمت الموافقة وتنفيذ الطلب بنجاح' });

        } catch (apiError) {
            console.error('Execution Error:', apiError.response?.data || apiError.message);
            // Don't delete original files on error, so we can retry? Or should we?
            // Usually if execution fails, we might want to keep the request pending or mark as failed.
            // But here we return 500. The files remain.
            return res.status(500).json({ 
                success: false, 
                message: 'فشل تنفيذ الطلب. قد يكون هناك خطأ في البيانات أو الصلاحيات.',
                error: apiError.response?.data
            });
        }
    } catch (error) {
        next(error);
    }
};

// 3. Reject Request
exports.rejectRequest = async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        // Fetch request to check for files
        const requestResult = await pool.query('SELECT * FROM pending_approvals WHERE id = $1', [id]);
        if (requestResult.rows.length > 0) {
             const row = requestResult.rows[0];
             const rawData = row.entity_data || row.request_data;
             
             let requestData;
             try {
                requestData = typeof rawData === 'string' 
                    ? JSON.parse(rawData) 
                    : rawData;
             } catch (e) {
                requestData = rawData;
             }
             
             if (requestData && (requestData.files || requestData.file)) {
                 if (requestData.files && Array.isArray(requestData.files)) {
                     for (const file of requestData.files) {
                         if (file.path && fs.existsSync(file.path)) {
                             try { fs.unlinkSync(file.path); } catch (e) {}
                         }
                     }
                 }
                 if (requestData.file && requestData.file.path && fs.existsSync(requestData.file.path)) {
                     try { fs.unlinkSync(requestData.file.path); } catch (e) {}
                 }
             }
        }

        try {
            // Update both possible column names for compatibility
            await pool.query(
                `UPDATE pending_approvals 
                 SET status = 'rejected', 
                     reviewed_by = $1, 
                     rejection_reason = $2,
                     review_notes = $2,
                     reviewed_at = CURRENT_TIMESTAMP 
                 WHERE id = $3`, 
                [req.admin.id, reason || null, id]
            );
        } catch (dbErr) {
            // Fallback if some columns don't exist
            console.error('Database update error in rejectRequest, trying fallback:', dbErr.message);
            await pool.query(
                "UPDATE pending_approvals SET status = 'rejected', reviewed_by = $1, review_notes = $2 WHERE id = $3", 
                [req.admin.id, reason || null, id]
            );
        }
        res.json({ success: true, message: 'تم رفض الطلب بنجاح' });
    } catch (error) {
        next(error);
    }
};

// 4. Delete Request (Hard Delete)
exports.deleteRequest = async (req, res, next) => {
    const { id } = req.params;
    try {
        // Fetch request to check for files to clean up
        const requestResult = await pool.query('SELECT * FROM pending_approvals WHERE id = $1', [id]);
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        const row = requestResult.rows[0];
        const rawData = row.entity_data || row.request_data;
        
        let requestData;
        try {
           requestData = typeof rawData === 'string' 
               ? JSON.parse(rawData) 
               : rawData;
        } catch (e) {
           requestData = rawData;
        }
        
        // Clean up files if any
        if (requestData && (requestData.files || requestData.file)) {
            if (requestData.files && Array.isArray(requestData.files)) {
                for (const file of requestData.files) {
                    if (file.path && fs.existsSync(file.path)) {
                        try { fs.unlinkSync(file.path); } catch (e) {}
                    }
                }
            }
            if (requestData.file && requestData.file.path && fs.existsSync(requestData.file.path)) {
                try { fs.unlinkSync(requestData.file.path); } catch (e) {}
            }
        }

        // Delete from database
        await pool.query('DELETE FROM pending_approvals WHERE id = $1', [id]);
        
        res.json({ success: true, message: 'تم حذف الطلب نهائياً بنجاح' });
    } catch (error) {
        next(error);
    }
};
