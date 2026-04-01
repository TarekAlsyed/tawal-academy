const validateEmail = (email) => {
  if (!email || !email.includes('@')) {
    return {
      valid: false,
      message: 'البريد الإلكتروني غير صالح'
    };
  }

  const emailLower = email.toLowerCase();
  
  if (!emailLower.endsWith('@gmail.com')) {
    return {
      valid: false,
      message: 'يجب استخدام بريد Gmail فقط (@gmail.com)'
    };
  }

  const emailRegex = /^[a-zA-Z0-9._-]+@gmail\.com$/;
  if (!emailRegex.test(emailLower)) {
    return {
      valid: false,
      message: 'صيغة البريد الإلكتروني غير صحيحة'
    };
  }

  return {
    valid: true,
    message: 'البريد الإلكتروني صحيح'
  };
};

module.exports = { validateEmail };
