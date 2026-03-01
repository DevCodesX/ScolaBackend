const rateLimit = require('express-rate-limit');

// Login rate limiter: relaxed for development
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // DEV: was 5
    message: {
        message: 'Too many login attempts. Please try again after 15 minutes.',
        message_ar: 'محاولات تسجيل دخول كثيرة جداً. الرجاء المحاولة بعد 15 دقيقة.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiter: relaxed for development
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000, // DEV: was 100
    message: {
        message: 'Too many requests. Please try again later.',
        message_ar: 'طلبات كثيرة جداً. الرجاء المحاولة لاحقاً.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Registration rate limiter: relaxed for development
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // DEV: was 3
    message: {
        message: 'Too many registration attempts. Please try again after 1 hour.',
        message_ar: 'محاولات تسجيل كثيرة جداً. الرجاء المحاولة بعد ساعة.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { loginLimiter, apiLimiter, registerLimiter };
