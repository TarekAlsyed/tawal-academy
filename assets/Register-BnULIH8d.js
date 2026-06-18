import{o as e}from"./rolldown-runtime-Bhmf7a9N.js";import{i as t,t as n}from"./react-vendor-D3_kerbS.js";import{s as r}from"./router-vendor-BwKEOOrm.js";import{Ut as i,Xt as a,ft as o,ht as s,p as c}from"./fi-BRtFnv06.js";/* empty css                     */var l=e(t()),u=n(),d=()=>{let[e,t]=(0,l.useState)({name:``,email:``}),[n,d]=(0,l.useState)(!1),[f,p]=(0,l.useState)(!navigator.onLine),[m,h]=(0,l.useState)(null),g=r();(0,l.useEffect)(()=>{let e=()=>p(!1),t=()=>p(!0);return window.addEventListener(`online`,e),window.addEventListener(`offline`,t),()=>{window.removeEventListener(`online`,e),window.removeEventListener(`offline`,t)}},[]);let _=n=>{t({...e,[n.target.name]:n.target.value})};return(0,u.jsxs)(`div`,{className:`landing-container`,children:[(0,u.jsx)(`style`,{children:`
        .landing-container {
          min-height: 100vh;
          background: radial-gradient(circle at 50% -20%, #17426A 0%, #152A3F 30%, #0F141A 70%, #080A0D 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Tajawal', sans-serif;
          position: relative;
          overflow: hidden;
          direction: rtl;
        }

        .landing-container::before {
          content: '';
          position: absolute;
          top: -150px;
          left: 50%;
          transform: translateX(-50%);
          width: 80vw;
          height: 300px;
          background: radial-gradient(ellipse at 50% 50%, rgba(0, 195, 255, 0.25) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .bg-pattern {
          position: absolute;
          bottom: 10%;
          left: 0;
          width: 100%;
          height: 40%;
          background-image: linear-gradient(30deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%, rgba(255,255,255,0.02)),
                            linear-gradient(150deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%, rgba(255,255,255,0.02)),
                            linear-gradient(30deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%, rgba(255,255,255,0.02)),
                            linear-gradient(150deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%, rgba(255,255,255,0.02)),
                            linear-gradient(60deg, rgba(255,255,255,0.02) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,0.02) 75%, rgba(255,255,255,0.02)),
                            linear-gradient(60deg, rgba(255,255,255,0.02) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,0.02) 75%, rgba(255,255,255,0.02));
          background-size: 80px 140px;
          background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
          opacity: 0.15;
          pointer-events: none;
        }

        .logo-wrapper {
          text-align: center;
          margin-bottom: 2.5rem;
          z-index: 10;
          animation: fadeDown 1s ease-out forwards;
        }

        .login-form-container {
          width: 100%;
          max-width: 400px;
          background: rgba(15, 20, 26, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2.5rem 2rem;
          z-index: 10;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          animation: slideUpFade 0.4s ease-out forwards;
        }

        .form-title {
          color: #FFF;
          font-size: 1.6rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 0.5rem;
          font-family: 'Tajawal', sans-serif;
        }

        .form-subtitle {
          color: #A2B1BC;
          font-size: 1rem;
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-label {
          display: block;
          color: #A2B1BC;
          font-weight: 700;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .form-input {
          width: 100%;
          padding: 1rem 1.25rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #FFF;
          font-size: 1rem;
          transition: all 0.3s ease;
          font-family: 'Tajawal', sans-serif;
          box-sizing: border-box;
          outline: none;
        }

        .form-input:focus {
          border-color: #00C8FF;
          background: rgba(0, 0, 0, 0.5);
          box-shadow: 0 0 0 3px rgba(0, 200, 255, 0.15);
        }

        .btn-submit {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #00C8FF 0%, #0096FF 100%);
          border: none;
          border-radius: 12px;
          color: #FFF;
          font-size: 1.1rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Tajawal', sans-serif;
          box-shadow: 0 5px 15px rgba(0, 150, 255, 0.3), inset 0 2px 0 rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 150, 255, 0.4), inset 0 2px 0 rgba(255,255,255,0.2);
          background: linear-gradient(135deg, #1AD1FF 0%, #1AA3FF 100%);
        }

        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .form-footer {
          margin-top: 1.5rem;
          text-align: center;
          color: #A2B1BC;
          font-size: 0.95rem;
        }

        .form-footer a {
          color: #00C8FF;
          text-decoration: none;
          font-weight: bold;
          transition: color 0.3s;
          cursor: pointer;
        }

        .form-footer a:hover {
          color: #fff;
        }

        .success-box {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          animation: slideUpFade 0.4s ease-out forwards;
        }

        .student-code-display {
          font-size: 2.5rem;
          font-weight: 800;
          color: #00C8FF;
          letter-spacing: 5px;
          margin: 1.5rem 0;
          background: rgba(0, 0, 0, 0.4);
          padding: 1rem;
          border-radius: 12px;
          border: 1px dashed rgba(0, 200, 255, 0.3);
          user-select: all;
          font-family: monospace;
        }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* SVG Logo Styles */
        .svg-logo-container {
          width: 140px;
          height: 140px;
          margin: 0 auto 1rem auto;
          filter: drop-shadow(0 0 20px rgba(0, 200, 255, 0.3));
        }

        .logo-text-group {
          margin-top: 1rem;
        }

        .logo-text-main {
          font-size: 2.2rem;
          font-weight: 900;
          color: #FFFFFF;
          letter-spacing: 4px;
          line-height: 1;
          margin: 0;
          text-transform: uppercase;
        }

        .logo-text-sub {
          font-size: 1rem;
          font-weight: 600;
          color: #00C8FF;
          letter-spacing: 8px;
          margin: 0;
          margin-top: 5px;
          text-transform: uppercase;
        }
      `}),(0,u.jsx)(`div`,{className:`bg-pattern`}),(0,u.jsxs)(`div`,{className:`logo-wrapper`,children:[(0,u.jsx)(`div`,{className:`svg-logo-container`,children:(0,u.jsxs)(`svg`,{viewBox:`0 0 200 200`,fill:`none`,xmlns:`http://www.w3.org/2000/svg`,children:[(0,u.jsx)(`path`,{d:`M100 20L180 160H20L100 20Z`,fill:`url(#paint0_linear)`,stroke:`#00C8FF`,strokeWidth:`4`}),(0,u.jsx)(`path`,{d:`M100 60L150 145H50L100 60Z`,fill:`url(#paint1_linear)`}),(0,u.jsx)(`circle`,{cx:`100`,cy:`115`,r:`25`,fill:`#00C8FF`,opacity:`0.8`}),(0,u.jsx)(`path`,{d:`M100 20L100 160`,stroke:`#FFFFFF`,strokeWidth:`2`,opacity:`0.5`,strokeDasharray:`5 5`}),(0,u.jsxs)(`defs`,{children:[(0,u.jsxs)(`linearGradient`,{id:`paint0_linear`,x1:`100`,y1:`20`,x2:`100`,y2:`160`,gradientUnits:`userSpaceOnUse`,children:[(0,u.jsx)(`stop`,{stopColor:`#005A8C`}),(0,u.jsx)(`stop`,{offset:`1`,stopColor:`#001428`})]}),(0,u.jsxs)(`linearGradient`,{id:`paint1_linear`,x1:`100`,y1:`60`,x2:`100`,y2:`145`,gradientUnits:`userSpaceOnUse`,children:[(0,u.jsx)(`stop`,{stopColor:`#0096FF`}),(0,u.jsx)(`stop`,{offset:`1`,stopColor:`#003C66`})]})]})]})}),(0,u.jsxs)(`div`,{className:`logo-text-group`,children:[(0,u.jsx)(`h1`,{className:`logo-text-main`,children:`TAWAL`}),(0,u.jsx)(`h2`,{className:`logo-text-sub`,children:`ACADEMY`})]})]}),(0,u.jsxs)(`div`,{className:`login-form-container`,children:[m?(0,u.jsxs)(`div`,{className:`success-box`,children:[(0,u.jsx)(c,{size:56,color:`#00C8FF`,style:{marginBottom:`1rem`}}),(0,u.jsx)(`h2`,{style:{color:`#FFF`,fontSize:`1.8rem`,marginBottom:`0.5rem`},children:`تم إنشاء الحساب بنجاح!`}),(0,u.jsx)(`p`,{style:{color:`#A2B1BC`},children:`احتفظ بهذا الكود جيداً، ستستخدمه لتسجيل الدخول:`}),(0,u.jsx)(`div`,{className:`student-code-display`,children:m.student_code}),(0,u.jsx)(`p`,{style:{color:`#00C8FF`,fontSize:`0.9rem`,marginTop:`1rem`,fontWeight:`bold`},children:`الحساب الآن قيد المراجعة من قبل الإدارة.`}),(0,u.jsx)(`button`,{onClick:()=>g(`/login`),className:`btn-submit`,style:{marginTop:`2rem`},children:`العودة لصفحة الدخول`})]}):(0,u.jsxs)(`form`,{onSubmit:async t=>{if(t.preventDefault(),f){a.error(`لا يمكنك التسجيل في وضع الأوفلاين. يرجى الاتصال بالإنترنت.`);return}let n=e.name.trim(),r=e.email.trim();if(!n||!r){a.error(`الاسم والبريد الإلكتروني مطلوبان`);return}if(!r.includes(`@`)){a.error(`البريد الإلكتروني غير صحيح`);return}d(!0);try{let e=await i({name:n,email:r});e.data.success?(a.success(`تم التسجيل بنجاح!`),h(e.data.data)):a.error(e.data.message||`فشل التسجيل`)}catch(e){a.error(e.response?.data?.message||`حدث خطأ أثناء التسجيل`)}finally{d(!1)}},children:[(0,u.jsx)(`h1`,{className:`form-title`,children:`إنشاء حساب جديد`}),(0,u.jsx)(`p`,{className:`form-subtitle`,children:`سجل الآن وانتظر موافقة الإدارة`}),f&&(0,u.jsxs)(`div`,{style:{background:`rgba(255,50,50,0.1)`,color:`#FF5555`,padding:`1rem`,borderRadius:`12px`,marginBottom:`1.5rem`,display:`flex`,alignItems:`center`,gap:`0.5rem`,fontWeight:`bold`},children:[(0,u.jsx)(s,{size:20}),`أنت الآن في وضع الأوفلاين.`]}),(0,u.jsxs)(`div`,{className:`input-group`,children:[(0,u.jsx)(`label`,{className:`form-label`,children:`الاسم الكامل`}),(0,u.jsx)(`input`,{type:`text`,name:`name`,value:e.name,onChange:_,placeholder:`أدخل اسمك الكامل`,required:!0,disabled:n||f,className:`form-input`})]}),(0,u.jsxs)(`div`,{className:`input-group`,children:[(0,u.jsx)(`label`,{className:`form-label`,children:`البريد الإلكتروني`}),(0,u.jsx)(`input`,{type:`email`,name:`email`,value:e.email,onChange:_,placeholder:`example@gmail.com`,required:!0,disabled:n||f,className:`form-input`})]}),(0,u.jsx)(`button`,{type:`submit`,disabled:n,className:`btn-submit`,children:n?(0,u.jsx)(u.Fragment,{children:`جاري التسجيل...`}):(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(o,{size:20}),` إنشاء الحساب`]})})]}),!m&&(0,u.jsxs)(`div`,{className:`form-footer`,children:[`لديك حساب بالفعل؟ `,(0,u.jsx)(`a`,{onClick:e=>{e.preventDefault(),g(`/login`)},children:`تسجيل الدخول`})]})]})]})};export{d as default};