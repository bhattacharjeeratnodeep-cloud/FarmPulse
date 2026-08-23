// ============ STRATEGIES ROUTES ============
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { verifyFirebaseAuth } = require('./auth');

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️  Supabase credentials not found in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============ PUBLIC ROUTES ============

// GET ALL STRATEGIES FOR A CROP (Public)
router.get('/crops/:crop', async (req, res) => {
    try {
        const { crop } = req.params;
        
        const { data, error } = await supabase
            .from('crop_strategies')
            .select('*')
            .eq('crop', crop)
            .order('profit', { ascending: false });
        
        if (error) {
            throw new Error(error.message);
        }
        
        // Transform data to match frontend structure
        const strategies = data.map(item => ({
            id: item.id,
            name: formatStrategyName(item.strategy_type),
            profit: item.profit,
            regen: item.regen_score,
            water: item.water_usage,
            fertilizer: item.fertilizer_usage,
            risk: item.risk_level,
            icon: getIconForStrategy(item.strategy_type)
        }));
        
        res.json({
            success: true,
            crop: crop,
            strategies,
            source: 'supabase',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching strategies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch strategies',
            message: error.message
        });
    }
});

// ============ PROTECTED ROUTES (require auth) ============

// GET SINGLE STRATEGY (Protected)
router.get('/:id', verifyFirebaseAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('crop_strategies')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            throw new Error(error.message);
        }
        
        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Strategy not found'
            });
        }
        
        res.json({
            success: true,
            strategy: data,
            user: req.user // Include authenticated user info
        });
    } catch (error) {
        console.error('Error fetching strategy:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch strategy',
            message: error.message
        });
    }
});

// CREATE NEW STRATEGY (Protected - Admin only in production)
router.post('/', verifyFirebaseAuth, async (req, res) => {
    try {
        const { crop, strategy_type, profit, regen_score, water_usage, fertilizer_usage, risk_level } = req.body;
        
        // Validate required fields
        if (!crop || !strategy_type || !profit || !regen_score) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        // Check if user is admin (you can modify this logic)
        if (req.user.role !== 'admin' && req.user.email !== 'admin@example.com') {
            return res.status(403).json({
                success: false,
                error: 'Permission denied'
            });
        }
        
        const { data, error } = await supabase
            .from('crop_strategies')
            .insert([
                {
                    crop,
                    strategy_type,
                    profit,
                    regen_score,
                    water_usage,
                    fertilizer_usage,
                    risk_level,
                    created_by: req.user.userId
                }
            ])
            .select();
        
        if (error) {
            throw new Error(error.message);
        }
        
        res.status(201).json({
            success: true,
            strategy: data[0],
            message: 'Strategy created successfully',
            created_by: req.user.userId
        });
    } catch (error) {
        console.error('Error creating strategy:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create strategy',
            message: error.message
        });
    }
});

// UPDATE STRATEGY (Protected)
router.put('/:id', verifyFirebaseAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Remove undefined values
        Object.keys(updates).forEach(key => {
            if (updates[key] === undefined) {
                delete updates[key];
            }
        });
        
        const { data, error } = await supabase
            .from('crop_strategies')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) {
            throw new Error(error.message);
        }
        
        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Strategy not found'
            });
        }
        
        res.json({
            success: true,
            strategy: data[0],
            message: 'Strategy updated successfully',
            updated_by: req.user.userId
        });
    } catch (error) {
        console.error('Error updating strategy:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update strategy',
            message: error.message
        });
    }
});

// DELETE STRATEGY (Protected)
router.delete('/:id', verifyFirebaseAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('crop_strategies')
            .delete()
            .eq('id', id);
        
        if (error) {
            throw new Error(error.message);
        }
        
        res.json({
            success: true,
            message: 'Strategy deleted successfully',
            deleted_id: id,
            deleted_by: req.user.userId
        });
    } catch (error) {
        console.error('Error deleting strategy:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete strategy',
            message: error.message
        });
    }
});

// ============ HELPER FUNCTIONS ============
function formatStrategyName(strategy_type) {
    const names = {
        'baseline': 'Baseline',
        'highInput': 'High-input',
        'balanced': 'Balanced (AI compromise)',
        'regenerative': 'Regenerative'
    };
    return names[strategy_type] || strategy_type;
}

function getIconForStrategy(strategy_type) {
    const icons = {
        'baseline': 'seedling',
        'highInput': 'industry',
        'balanced': 'handshake',
        'regenerative': 'leaf'
    };
    return icons[strategy_type] || 'leaf';
}

module.exports = router;