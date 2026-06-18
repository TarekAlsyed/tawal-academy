import{o as e}from"./rolldown-runtime-Bhmf7a9N.js";import{i as t,t as n}from"./react-vendor-D3_kerbS.js";import{s as r}from"./router-vendor-BwKEOOrm.js";import{Xt as i,ht as a,ut as o,z as s}from"./fi-BRtFnv06.js";import{t as c}from"./index-CegcCHBQ.js";/* empty css                     */var l=e(t()),u=n(),d=()=>{let[e,t]=(0,l.useState)({studentCode:``}),[n,d]=(0,l.useState)(!1),[f,p]=(0,l.useState)(!navigator.onLine),{login:m,isAuthenticated:h}=c(),g=r();return(0,l.useEffect)(()=>{let e=()=>p(!1),t=()=>p(!0);return window.addEventListener(`online`,e),window.addEventListener(`offline`,t),()=>{window.removeEventListener(`online`,e),window.removeEventListener(`offline`,t)}},[]),(0,l.useEffect)(()=>{h&&g(`/terms`)},[h,g]),(0,u.jsxs)(`div`,{className:`landing-container`,children:[(0,u.jsx)(`style`,{children:`
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

        .logo-img {
          width: 140px;
          height: 140px;
          object-fit: contain;
          margin-bottom: 1rem;
          filter: drop-shadow(0 0 15px rgba(0, 200, 255, 0.4)) drop-shadow(0 0 30px rgba(0, 150, 255, 0.2));
          border-radius: 20px;
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

        .form-input-wrap {
          position: relative;
          margin-bottom: 2rem;
        }

        .form-input-icon {
          position: absolute;
          top: 50%;
          right: 1rem;
          transform: translateY(-50%);
          color: #4FA4F2;
        }

        .form-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(79, 164, 242, 0.3);
          border-radius: 12px;
          padding: 1rem 3rem 1rem 1rem;
          color: #FFF;
          font-family: 'Tajawal', sans-serif;
          font-size: 1.1rem;
          outline: none;
          transition: all 0.3s;
          box-sizing: border-box;
        }
        .form-input:focus {
          border-color: #4FA4F2;
          box-shadow: 0 0 10px rgba(79, 164, 242, 0.2);
          background: rgba(0, 0, 0, 0.5);
        }
        .form-input::placeholder { color: rgba(255,255,255,0.3); }

        .btn-metallic {
          width: 100%;
          padding: 1.1rem;
          border-radius: 12px;
          font-family: 'Tajawal', sans-serif;
          font-size: 1.2rem;
          font-weight: 800;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: transform 0.2s, filter 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .btn-metallic:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        .btn-metallic:active:not(:disabled) {
          transform: translateY(1px);
        }
        .btn-metallic:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-blue {
          background: linear-gradient(180deg, #1C4872 0%, #0E253E 100%);
          color: #FFFFFF;
          border-top: 1px solid rgba(255,255,255,0.3);
          box-shadow: inset 0 2px 5px rgba(255,255,255,0.1), inset 0 -3px 5px rgba(0,0,0,0.4), 0 8px 15px rgba(0,0,0,0.4);
        }

        .register-link {
          display: block;
          text-align: center;
          margin-top: 1.5rem;
          color: #A2B1BC;
          font-size: 0.95rem;
          text-decoration: none;
          transition: color 0.3s;
        }
        .register-link span {
          color: #4FA4F2;
          font-weight: bold;
        }
        .register-link:hover span {
          color: #00C8FF;
          text-shadow: 0 0 5px rgba(0, 200, 255, 0.5);
        }

        .offline-badge {
          position: absolute;
          top: 1rem;
          background: rgba(220, 38, 38, 0.8);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 20;
          backdrop-filter: blur(5px);
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}),(0,u.jsx)(`div`,{className:`bg-pattern`}),f&&(0,u.jsxs)(`div`,{className:`offline-badge`,children:[(0,u.jsx)(a,{size:16}),` أنت أوفلاين`]}),(0,u.jsx)(`div`,{className:`logo-wrapper`,children:(0,u.jsx)(`img`,{src:`/icon.png`,alt:`أكاديمية طوال`,className:`logo-img`,onError:e=>e.target.style.display=`none`})}),(0,u.jsxs)(`div`,{className:`login-form-container`,children:[(0,u.jsx)(`h2`,{className:`form-title`,children:`تسجيل الدخول`}),(0,u.jsx)(`p`,{className:`form-subtitle`,children:`مرحباً بك مجدداً في منصتك التعليمية`}),(0,u.jsxs)(`form`,{onSubmit:async t=>{if(t.preventDefault(),f){i.error(`لا يمكنك تسجيل الدخول في وضع الأوفلاين. يرجى الاتصال بالإنترنت.`);return}let n=e.studentCode.trim();if(!n){i.error(`كود الطالب مطلوب`);return}d(!0);try{let e=await m(n);e.success?i.success(`مرحباً بك في أكاديمية طوال!`):i.error(e.message||`فشل تسجيل الدخول`)}catch{i.error(`حدث خطأ أثناء تسجيل الدخول`)}finally{d(!1)}},children:[(0,u.jsx)(`label`,{className:`form-label`,children:`كود الطالب`}),(0,u.jsxs)(`div`,{className:`form-input-wrap`,children:[(0,u.jsx)(o,{size:20,className:`form-input-icon`}),(0,u.jsx)(`input`,{type:`text`,name:`studentCode`,value:e.studentCode,onChange:n=>{t({...e,[n.target.name]:n.target.value})},placeholder:`أدخل كود الطالب هنا...`,required:!0,disabled:n||f,className:`form-input`,autoFocus:!0})]}),(0,u.jsx)(`button`,{type:`submit`,disabled:n,className:`btn-metallic btn-blue`,children:n?`جاري الدخول...`:(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(s,{size:20}),` دخول المنصة`]})})]}),(0,u.jsxs)(`a`,{href:`/register`,onClick:e=>{e.preventDefault(),g(`/register`)},className:`register-link`,children:[`ليس لديك حساب؟ `,(0,u.jsx)(`span`,{children:`أنشئ حساباً جديداً`})]})]})]})};export{d as default};