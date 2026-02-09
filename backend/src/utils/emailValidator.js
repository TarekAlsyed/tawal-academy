const isValidGmail = (email) => {
  // التحقق من أن الإيميل ينتهي بـ @gmail.com
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
  return gmailRegex.test(email);
};

const validateEmail = (email) => {
  if (!email) {
    return {
      valid: false,
      message: 'الإيميل مطلوب'
    };
  }

  if (!isValidGmail(email)) {
    return {
      valid: false,
      message: 'يجب أن يكون الإيميل من Gmail فقط (@gmail.com)'
    };
  }

  return {
    valid: true,
    message: 'الإيميل صحيح'
  };
};

module.exports = { isValidGmail, validateEmail };
