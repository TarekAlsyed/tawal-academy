import{o as e}from"./rolldown-runtime-Bhmf7a9N.js";import{i as t,t as n}from"./react-vendor-D3_kerbS.js";import{s as r}from"./router-vendor-BwKEOOrm.js";import{E as i,R as a,T as o,V as s,Xt as c,b as l,tt as u,v as d}from"./fi-BRtFnv06.js";import{t as f}from"./index-CegcCHBQ.js";/* empty css                     */var p=e(t()),m=n(),h=()=>{let[e,t]=(0,p.useState)({email:``,password:``,mfaCode:``}),[n,h]=(0,p.useState)(!1),[g,_]=(0,p.useState)(!1),[v,y]=(0,p.useState)(!1);r();let{adminLogin:b}=f(),x=(e,t)=>{e&&(navigator.clipboard.writeText(e),c.success(`تم نسخ ${t} بنجاح`,{position:`bottom-center`}))},S=async e=>{try{let n=await navigator.clipboard.readText();n&&(t(t=>({...t,[e]:n})),c.success(`تم اللصق في ${e===`email`?`البريد`:`كلمة المرور`}`,{position:`bottom-center`}))}catch{c.error(`لا يمكن الوصول للحافظة. يرجى السماح بالصلاحية أو استخدام Ctrl+V`)}},C=n=>{t({...e,[n.target.name]:n.target.value})};return(0,m.jsxs)(`div`,{className:`vs-login-page`,children:[(0,m.jsx)(`style`,{children:`
        .vs-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--vs-bg-page);
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          font-family: 'Tajawal', sans-serif;
        }
        .vs-admin-login-card {
          background: var(--vs-bg-card);
          border: 1px solid var(--vs-border);
          border-radius: var(--vs-radius-xl);
          padding: 2.5rem 2rem;
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 10;
          box-shadow: var(--vs-shadow-lg);
          animation: vs-slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          border-top: 3px solid var(--vs-primary);
        }
        .vs-admin-login-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, var(--vs-primary), var(--vs-primary-dark));
          border-radius: var(--vs-radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
          box-shadow: 0 8px 20px rgba(0, 169, 157, 0.3);
        }
        .vs-admin-login-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--vs-text-heading);
          margin: 0 0 0.35rem 0;
        }
        .vs-admin-login-subtitle {
          color: var(--vs-text-secondary);
          font-size: 0.9rem;
        }
        .vs-admin-form-group {
          margin-bottom: 1.25rem;
        }
        .vs-admin-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          color: var(--vs-text-primary);
          font-weight: 700;
          font-size: 0.875rem;
        }
        .vs-admin-label-actions {
          display: flex;
          gap: 0.5rem;
        }
        .vs-admin-label-btn {
          background: none;
          border: none;
          color: var(--vs-primary);
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 2px;
          font-family: 'Tajawal', sans-serif;
          padding: 0;
        }
        .vs-admin-label-btn:hover { opacity: 0.7; }
        .vs-admin-input-wrap {
          position: relative;
        }
        .vs-admin-input-wrap svg:first-child {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          right: 1rem;
          color: var(--vs-text-muted);
        }
        .vs-admin-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          padding-right: 2.75rem;
          border-radius: var(--vs-radius-md);
          border: 1.5px solid var(--vs-border);
          font-size: 0.95rem;
          outline: none;
          background: var(--vs-bg-input);
          font-family: 'Tajawal', sans-serif;
          color: var(--vs-text-primary);
          box-sizing: border-box;
          transition: all 0.25s;
        }
        .vs-admin-input:focus {
          border-color: var(--vs-primary);
          box-shadow: 0 0 0 3px rgba(0, 169, 157, 0.12);
          background: var(--vs-bg-card);
        }
        .vs-admin-input::placeholder { color: var(--vs-text-muted); }
        .vs-admin-eye-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          left: 1rem;
          background: none;
          border: none;
          color: var(--vs-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }
        .vs-admin-submit {
          width: 100%;
          padding: 0.95rem;
          border: none;
          border-radius: var(--vs-radius-md);
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          background: var(--vs-primary);
          color: white;
          box-shadow: 0 4px 16px rgba(0, 169, 157, 0.3);
          font-family: 'Tajawal', sans-serif;
          transition: all 0.25s;
          margin-top: 0.5rem;
        }
        .vs-admin-submit:hover:not(:disabled) {
          background: var(--vs-primary-dark);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 169, 157, 0.4);
        }
        .vs-admin-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .vs-admin-back-btn {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--vs-border);
          border-radius: var(--vs-radius-md);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          background: var(--vs-bg-card);
          color: var(--vs-text-primary);
          font-family: 'Tajawal', sans-serif;
          transition: all 0.25s;
          margin-top: 0.75rem;
        }
        .vs-admin-back-btn:hover {
          background: var(--vs-bg-hover);
        }
        @media (max-width: 480px) {
          .vs-admin-login-card { padding: 2rem 1.5rem; }
        }
      `}),(0,m.jsxs)(`div`,{className:`vs-admin-login-card`,children:[(0,m.jsxs)(`div`,{style:{textAlign:`center`,marginBottom:`2rem`},children:[(0,m.jsx)(`div`,{className:`vs-admin-login-icon`,children:(0,m.jsx)(u,{size:28,color:`white`})}),(0,m.jsx)(`h1`,{className:`vs-admin-login-title`,children:g?`التحقق الثنائي`:`تسجيل دخول المسؤول`}),(0,m.jsx)(`p`,{className:`vs-admin-login-subtitle`,children:g?`أدخل رمز التحقق من تطبيق Authenticator`:`Tawal Academy لوحة تحكم`})]}),(0,m.jsxs)(`form`,{onSubmit:async t=>{if(t.preventDefault(),!e.email||!e.password){c.error(`الإيميل وكلمة المرور مطلوبان`);return}if(g&&!e.mfaCode){c.error(`يرجى إدخال رمز التحقق (MFA)`);return}h(!0);try{let t=await b(e.email,e.password,e.mfaCode);t.success?t.mfaRequired?(_(!0),c.info(`تم التحقق من كلمة المرور. يرجى إدخال رمز التحقق (MFA)`)):c.success(`مرحباً بك في لوحة التحكم!`):c.error(t.message)}catch{c.error(`حدث خطأ أثناء تسجيل الدخول`)}finally{h(!1)}},children:[g?(0,m.jsxs)(`div`,{className:`vs-admin-form-group`,children:[(0,m.jsxs)(`label`,{className:`vs-admin-label`,children:[(0,m.jsx)(`span`,{children:`رمز التحقق (6 أرقام)`}),(0,m.jsxs)(`button`,{type:`button`,className:`vs-admin-label-btn`,onClick:()=>S(`mfaCode`),children:[(0,m.jsx)(d,{size:12}),` لصق الرمز`]})]}),(0,m.jsxs)(`div`,{className:`vs-admin-input-wrap`,children:[(0,m.jsx)(a,{size:16}),(0,m.jsx)(`input`,{type:`text`,name:`mfaCode`,className:`vs-admin-input`,style:{textAlign:`center`,letterSpacing:`0.5rem`,fontSize:`1.25rem`},placeholder:`000000`,value:e.mfaCode,onChange:C,maxLength:6,autoFocus:!0,required:!0})]})]}):(0,m.jsxs)(m.Fragment,{children:[(0,m.jsxs)(`div`,{className:`vs-admin-form-group`,children:[(0,m.jsxs)(`label`,{className:`vs-admin-label`,children:[(0,m.jsx)(`span`,{children:`البريد الإلكتروني`}),(0,m.jsxs)(`div`,{className:`vs-admin-label-actions`,children:[(0,m.jsxs)(`button`,{type:`button`,className:`vs-admin-label-btn`,onClick:()=>S(`email`),children:[(0,m.jsx)(d,{size:12}),` لصق`]}),(0,m.jsxs)(`button`,{type:`button`,className:`vs-admin-label-btn`,style:{color:`var(--vs-text-muted)`},onClick:()=>x(e.email,`البريد`),children:[(0,m.jsx)(l,{size:12}),` نسخ`]})]})]}),(0,m.jsxs)(`div`,{className:`vs-admin-input-wrap`,children:[(0,m.jsx)(s,{size:16}),(0,m.jsx)(`input`,{type:`email`,name:`email`,className:`vs-admin-input`,placeholder:`name@example.com`,value:e.email,onChange:C,required:!0})]})]}),(0,m.jsxs)(`div`,{className:`vs-admin-form-group`,children:[(0,m.jsxs)(`label`,{className:`vs-admin-label`,children:[(0,m.jsx)(`span`,{children:`كلمة المرور`}),(0,m.jsxs)(`div`,{className:`vs-admin-label-actions`,children:[(0,m.jsxs)(`button`,{type:`button`,className:`vs-admin-label-btn`,onClick:()=>S(`password`),children:[(0,m.jsx)(d,{size:12}),` لصق`]}),(0,m.jsxs)(`button`,{type:`button`,className:`vs-admin-label-btn`,style:{color:`var(--vs-text-muted)`},onClick:()=>x(e.password,`كلمة المرور`),children:[(0,m.jsx)(l,{size:12}),` نسخ`]})]})]}),(0,m.jsxs)(`div`,{className:`vs-admin-input-wrap`,children:[(0,m.jsx)(a,{size:16}),(0,m.jsx)(`input`,{type:v?`text`:`password`,name:`password`,className:`vs-admin-input`,style:{paddingLeft:`2.75rem`},placeholder:`••••••••`,value:e.password,onChange:C,required:!0}),(0,m.jsx)(`button`,{type:`button`,className:`vs-admin-eye-btn`,onClick:()=>y(!v),children:v?(0,m.jsx)(i,{size:18}):(0,m.jsx)(o,{size:18})})]})]})]}),(0,m.jsx)(`button`,{type:`submit`,className:`vs-admin-submit`,disabled:n,children:n?`جاري التحقق...`:g?`تأكيد الرمز`:`تسجيل الدخول`}),g&&(0,m.jsx)(`button`,{type:`button`,className:`vs-admin-back-btn`,onClick:()=>_(!1),children:`رجوع لتسجيل الدخول`})]})]})]})};export{h as default};