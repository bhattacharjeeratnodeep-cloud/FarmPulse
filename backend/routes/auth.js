// ============ AUTH ROUTES ============
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// ============ HELPER FUNCTIONS ============
function verifyFirebaseToken(token) {
    return admin.auth().verifyIdToken(token);
}

function generateJWT(user) {
    return jwt.sign(
        { 
            userId: user.uid,
            email: user.email,
            role: user.role || 'user'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

// ============ ROUTES ============

// Sign up with email/password (through Firebase)
router.post('/signup', [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('displayName').optional().isString()
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { email, password, displayName } = req.body;

        // Create user in Firebase
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: displayName || email.split('@')[0],
            emailVerified: false
        });

        // Generate custom token
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        // Generate JWT
        const jwtToken = generateJWT({
            uid: userRecord.uid,
            email: userRecord.email,
            role: 'user'
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName
            },
            customToken,
            jwtToken
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to create user',
            message: error.message
        });
    }
});

// Login with email/password
router.post('/login', [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { email, password } = req.body;

        // Get user from Firebase
        const userRecord = await admin.auth().getUserByEmail(email);

        // In production, you'd verify the password against Firebase Auth
        // For demo, we'll assume password is valid (in production use Firebase Admin SDK to verify)
        
        // Generate custom token
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        // Generate JWT
        const jwtToken = generateJWT({
            uid: userRecord.uid,
            email: userRecord.email,
            role: 'user'
        });

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName
            },
            customToken,
            jwtToken
        });

    } catch (error) {
        console.error('Login error:', error);
        
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to login',
            message: error.message
        });
    }
});

// Verify Firebase ID token
router.post('/verify-token', async (req, res) => {
    try {
        const { idToken } = req.body;
        
        if (!idToken) {
            return res.status(400).json({
                success: false,
                error: 'No ID token provided'
            });
        }

        // Verify the token
        const decodedToken = await verifyFirebaseToken(idToken);
        
        res.json({
            success: true,
            message: 'Token verified',
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            message: error.message
        });
    }
});

// Get current user profile
router.get('/profile', async (req, res) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from Firebase
        const userRecord = await admin.auth().getUser(decoded.userId);
        
        res.json({
            success: true,
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                photoURL: userRecord.photoURL,
                emailVerified: userRecord.emailVerified,
                role: decoded.role || 'user'
            }
        });

    } catch (error) {
        console.error('Profile error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to get profile',
            message: error.message
        });
    }
});

// Logout (optional - client side handles this)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Middleware to verify Firebase token
const verifyFirebaseAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Try to verify as JWT first
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (jwtError) {
            // If JWT verification fails, try Firebase token
            const decodedToken = await verifyFirebaseToken(token);
            req.user = {
                userId: decodedToken.uid,
                email: decodedToken.email,
                role: 'user'
            };
            return next();
        }

    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: error.message
        });
    }
};

// Export the middleware for use in other routes
module.exports = router;
module.exports.verifyFirebaseAuth = verifyFirebaseAuth;