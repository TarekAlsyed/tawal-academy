const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { deviceCheckMiddleware } = require('../middlewares/deviceCheck');

exports.login = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const deviceId = req.deviceId;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والإيميل مطلوبان'
      });
    }

    const user = await User.findOrCreate(name, email, deviceId);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict'
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          totalPoints: user.total_points
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    const rank = await User.getUserRank(userId);

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          rank
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
};
