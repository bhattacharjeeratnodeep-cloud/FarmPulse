// ============ FIREBASE CONFIGURATION ============
// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAuREBelY3XF_mzy_plW4c4Kio3zuZe7I0",
  authDomain: "farmpulse9.firebaseapp.com",
  projectId: "farmpulse9",
  storageBucket: "farmpulse9.firebasestorage.app",
  messagingSenderId: "44319403169",
  appId: "1:44319403169:web:bbdb06bcf476847633d4e0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============ SUPABASE CONFIGURATION ============
// Your actual Supabase credentials
const supabaseUrl = 'https://ulbvvidcqarsohybgnuz.supabase.co';
const supabaseAnonKey = 'sb_publishable_MCPMmAg-mjtO40PAYb9Q_5ky7fBge';
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

// ============ APP STATE ============
let currentUser = null;
let authToken = null;
let activeScenarios = [];
let currentCrop = 'rice';
let profitLimit = 45000;
let regenLimit = 70;
let chatHistory = [];

// ============ AUTH FUNCTIONS ============
async function googleSignIn() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const userCredential = await auth.signInWithPopup(provider);
        
        const idToken = await userCredential.user.getIdToken();
        localStorage.setItem('firebase_token', idToken);
        
        // Store user in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName || 'Google User',
            photoURL: userCredential.user.photoURL || '',
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        currentUser = userCredential.user;
        updateAuthUI();
        closeAuthModal();
        addAIMessage(`Welcome ${currentUser.displayName || currentUser.email}! You're now signed in to FarmPulse. 🌾`);
    } catch (error) {
        console.error('Google sign-in error:', error);
        alert('Error signing in with Google: ' + error.message);
    }
}

async function loginWithEmail() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const idToken = await userCredential.user.getIdToken();
        
        localStorage.setItem('firebase_token', idToken);
        
        currentUser = userCredential.user;
        updateAuthUI();
        closeAuthModal();
        addAIMessage(`Welcome back ${currentUser.email}!`);
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

async function signUpWithEmail() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const idToken = await userCredential.user.getIdToken();
        
        localStorage.setItem('firebase_token', idToken);
        
        // Store user in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: email.split('@')[0],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentUser = userCredential.user;
        updateAuthUI();
        closeAuthModal();
        addAIMessage(`Account created for ${currentUser.email}! Welcome to FarmPulse.`);
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed: ' + error.message);
    }
}

async function signOut() {
    try {
        await auth.signOut();
        currentUser = null;
        authToken = null;
        localStorage.removeItem('firebase_token');
        updateAuthUI();
        addAIMessage('You have been signed out from FarmPulse.');
    } catch (error) {
        console.error('Signout error:', error);
    }
}

// ============ AUTH UI ============
function updateAuthUI() {
    const authSection = document.getElementById('authSection');
    
    if (currentUser) {
        authSection.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                ${currentUser.photoURL ? `<img src="${currentUser.photoURL}" style="width:30px; height:30px; border-radius:50%;">` : `<i class="fas fa-user-circle" style="font-size:1.5rem;"></i>`}
                <span style="font-size:0.8rem; font-weight:600;">${currentUser.displayName || currentUser.email}</span>
                <button onclick="signOut()" class="btn-outline" style="padding:0.4rem 0.8rem; font-size:0.7rem; border-radius:20px;">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </button>
            </div>
        `;
    } else {
        authSection.innerHTML = `
            <button onclick="showAuthModal()" class="btn" style="padding:0.5rem 1rem; font-size:0.8rem;">
                <i class="fas fa-user-circle"></i> Sign In
            </button>
        `;
    }
}

function showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function showSignupForm() {
    const email = prompt('Enter your email:');
    const password = prompt('Enter password (min 6 characters):');
    
    if (email && password) {
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = password;
        signUpWithEmail();
    }
}

// ============ DATA FETCHING ============
async function fetchScenarios(cropName) {
    try {
        const { data, error } = await supabase
            .from('crop_strategies')
            .select('*')
            .eq('crop', cropName);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            return data.map(item => ({
                id: item.id,
                name: formatStrategyName(item.strategy_type),
                profit: item.profit,
                regen: item.regen_score,
                water: item.water_usage,
                fertilizer: item.fertilizer_usage,
                risk: item.risk_level,
                icon: getIconForStrategy(item.strategy_type)
            }));
        }
        
        // Fallback to mock data if no data found
        return fetchMockData(cropName);
    } catch (error) {
        console.error('Error fetching from Supabase:', error);
        return fetchMockData(cropName);
    }
}

// Mock data (fallback)
function fetchMockData(cropName) {
    const mockData = {
        rice: [
            { name: 'Baseline', profit: 41000, regen: 62, water: 320, fertilizer: 120, risk: 'moderate', icon: 'seedling' },
            { name: 'High-input', profit: 48000, regen: 51, water: 560, fertilizer: 210, risk: 'high', icon: 'industry' },
            { name: 'Balanced (AI compromise)', profit: 45300, regen: 76, water: 390, fertilizer: 140, risk: 'medium', icon: 'handshake' },
            { name: 'Regenerative', profit: 38000, regen: 88, water: 260, fertilizer: 70, risk: 'low', icon: 'leaf' }
        ],
        wheat: [
            { name: 'Baseline', profit: 38000, regen: 58, water: 290, fertilizer: 100, risk: 'moderate', icon: 'seedling' },
            { name: 'High-input', profit: 45200, regen: 48, water: 510, fertilizer: 190, risk: 'high', icon: 'industry' },
            { name: 'Balanced (AI compromise)', profit: 41500, regen: 72, water: 340, fertilizer: 130, risk: 'medium', icon: 'handshake' },
            { name: 'Regenerative', profit: 34000, regen: 85, water: 240, fertilizer: 65, risk: 'low', icon: 'leaf' }
        ],
        maize: [
            { name: 'Baseline', profit: 52000, regen: 50, water: 380, fertilizer: 150, risk: 'high', icon: 'seedling' },
            { name: 'High-input', profit: 60000, regen: 40, water: 680, fertilizer: 250, risk: 'high', icon: 'industry' },
            { name: 'Balanced (AI compromise)', profit: 56000, regen: 66, water: 420, fertilizer: 180, risk: 'medium', icon: 'handshake' },
            { name: 'Regenerative', profit: 46000, regen: 80, water: 290, fertilizer: 80, risk: 'low', icon: 'leaf' }
        ],
        cotton: [
            { name: 'Baseline', profit: 45000, regen: 55, water: 350, fertilizer: 130, risk: 'moderate', icon: 'seedling' },
            { name: 'High-input', profit: 52000, regen: 45, water: 600, fertilizer: 230, risk: 'high', icon: 'industry' },
            { name: 'Balanced (AI compromise)', profit: 48000, regen: 70, water: 400, fertilizer: 150, risk: 'medium', icon: 'handshake' },
            { name: 'Regenerative', profit: 40000, regen: 82, water: 280, fertilizer: 75, risk: 'low', icon: 'leaf' }
        ]
    };
    
    return mockData[cropName] || mockData.rice;
}

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

// ============ RENDER FUNCTIONS ============
function renderScenarios(scenarios) {
    const container = document.getElementById('scenarioContainer');
    container.innerHTML = '';
    
    scenarios.forEach((s, idx) => {
        const item = document.createElement('div');
        item.className = `scenario-item ${idx === 2 ? 'selected' : ''}`;
        
        const satisfies = s.profit >= profitLimit && s.regen >= regenLimit;
        
        item.innerHTML = `
            <div class="scenario-head">
                <span class="scenario-name"><i class="fas fa-${s.icon || 'leaf'}"></i> ${s.name}</span>
                <span class="score-tag">Regen ${s.regen}</span>
            </div>
            <div class="metrics-grid">
                <span><i class="fas fa-rupee-sign"></i> ₹${s.profit.toLocaleString()}</span>
                <span><i class="fas fa-tint"></i> ${s.water}m³</span>
                <span><i class="fas fa-flask"></i> ${s.fertilizer}kg</span>
            </div>
            <div class="risk-row">
                <i class="fas fa-exclamation-triangle"></i> Risk: ${s.risk || 'medium'}
                ${satisfies ? '<span class="constraint-badge">✅ Meets Constraints</span>' : ''}
            </div>
        `;
        
        container.appendChild(item);
    });
}

// ============ MAIN FUNCTIONS ============
async function generateScenarios() {
    currentCrop = document.getElementById('cropSelect').value;
    profitLimit = Number(document.getElementById('profitConstraint').value) || 45000;
    regenLimit = Number(document.getElementById('regenerativeConstraint').value) || 70;
    
    const container = document.getElementById('scenarioContainer');
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Generating strategies...</div>';
    
    const scenarioList = await fetchScenarios(currentCrop);
    
    activeScenarios = scenarioList;
    renderScenarios(scenarioList);
    
    addAIMessage(`Generated ${scenarioList.length} farming strategies for ${currentCrop}. Set your constraints and let me find the best option! 🌾`);
}

function aiNegotiate() {
    const profitTarget = Number(document.getElementById('profitConstraint').value) || 45000;
    const regenTarget = Number(document.getElementById('regenerativeConstraint').value) || 70;
    
    let message = `Analyzing strategies for profit ≥ ₹${profitTarget.toLocaleString()} and regen ≥ ${regenTarget}. `;
    
    let bestScenario = null;
    let bestScore = -Infinity;
    
    activeScenarios.forEach(s => {
        let score = 0;
        if (s.profit >= profitTarget) score += 50;
        if (s.regen >= regenTarget) score += 50;
        if (s.profit >= profitTarget && s.regen >= regenTarget) score += 100;
        if (score > bestScore) {
            bestScore = score;
            bestScenario = s;
        }
    });
    
    if (bestScenario && bestScore >= 100) {
        message += `Found ideal solution: <strong>${bestScenario.name}</strong> (Profit ₹${bestScenario.profit.toLocaleString()}, Regen ${bestScenario.regen}) ✅`;
    } else if (bestScenario) {
        message += `Best match: <strong>${bestScenario.name}</strong>. Consider relaxing constraints for better results.`;
    } else {
        message += 'No matching strategy found. Try adjusting your constraints.';
    }
    
    addAIMessage(message);
    
    if (bestScenario) {
        const items = document.querySelectorAll('.scenario-item');
        items.forEach((item, idx) => {
            if (idx === activeScenarios.findIndex(s => s.name === bestScenario.name)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
}

// ============ CHAT FUNCTIONS (FIXED) ============
function addUserMessage(text) {
    const chatBox = document.getElementById('chatBox');
    const userMsg = document.createElement('div');
    userMsg.className = 'user-msg';
    userMsg.innerHTML = `<i class="fas fa-user-circle"></i><div class="message-bubble">${text}</div>`;
    chatBox.appendChild(userMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addAIMessage(text) {
    const chatBox = document.getElementById('chatBox');
    const aiMsg = document.createElement('div');
    aiMsg.className = 'ai-msg';
    aiMsg.innerHTML = `<i class="fas fa-robot"></i><div class="message-bubble">${text}</div>`;
    chatBox.appendChild(aiMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function sendChat() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Add user message
    addUserMessage(text);
    input.value = '';
    
    // Generate AI response
    const response = generateAIResponse(text);
    
    // Add AI response after a short delay
    setTimeout(() => {
        addAIMessage(response);
    }, 500);
}

function generateAIResponse(text) {
    const lowerText = text.toLowerCase();
    let response = '';
    
    // Check for keywords
    if (lowerText.includes('profit') || lowerText.includes('money') || lowerText.includes('income')) {
        response = '💰 **Profit Optimization**: To maximize profit, consider reducing regenerative constraints by 5-10 points. This could increase yields by 15-20%. However, this may impact long-term soil health. A balanced approach is usually best.';
    } else if (lowerText.includes('regen') || lowerText.includes('sustain') || lowerText.includes('environment')) {
        response = '🌱 **Regenerative Practices**: Prioritizing regenerative practices may reduce short-term profit by 10-15%, but improves soil health, water retention, and long-term sustainability. I recommend the Regenerative strategy for long-term benefits.';
    } else if (lowerText.includes('balance') || lowerText.includes('compromise') || lowerText.includes('best')) {
        response = '⚖️ **Balanced Strategy**: The balanced approach offers: Profit ₹45,300, Regen score 76. It provides good short-term returns while maintaining sustainability. This is my recommended choice!';
    } else if (lowerText.includes('water') || lowerText.includes('irrigation')) {
        response = '💧 **Water Usage**: Current options: Baseline 320m³, High-input 560m³, Regenerative 260m³. Choose Regenerative strategy to save 19% more water. ';
    } else if (lowerText.includes('risk') || lowerText.includes('danger')) {
        response = '⚠️ **Risk Assessment**: High-input strategies carry more risk (pest resistance, water scarcity). Regenerative strategies are lower risk but may have lower initial yields. Balance is key.';
    } else if (lowerText.includes('fertilizer') || lowerText.includes('chemical')) {
        response = '🧪 **Fertilizer Usage**: High-input uses 210kg, Regenerative only 70kg. Consider reducing chemical fertilizers to improve soil biology and save costs.';
    } else if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
        response = '👋 Hello! I\'m FarmPulse AI. I can help you with: 🌾 Crop selection, 💰 Profit optimization, 🌱 Regenerative practices, 💧 Water conservation, ⚠️ Risk management. What would you like to explore?';
    } else if (lowerText.includes('help')) {
        response = '🤝 **How can I help?** You can ask me about: - Maximizing profit - Sustainable farming - Water conservation - Risk management - Crop selection. Try asking a specific question!';
    } else if (lowerText.includes('crop') || lowerText.includes('plant')) {
        response = '🌾 **Crop Selection**: Currently analyzing: Rice, Wheat, Maize, Cotton. Each has different profit potential and environmental impact. Which crop would you like to explore?';
    } else {
        response = '🤖 **FarmPulse AI**: I can analyze trade-offs between profit, productivity, and environmental impact. Try asking about "profit optimization", "regenerative farming", or "balanced strategy".';
    }
    
    return response;
}

// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('FarmPulse initializing...');
    console.log('Supabase URL:', supabaseUrl);
    
    // Attach event listeners
    const generateBtn = document.getElementById('generateScenariosBtn');
    const negotiateBtn = document.getElementById('negotiateBtn');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');
    
    if (generateBtn) generateBtn.addEventListener('click', generateScenarios);
    if (negotiateBtn) negotiateBtn.addEventListener('click', aiNegotiate);
    if (sendChatBtn) sendChatBtn.addEventListener('click', sendChat);
    
    // Chat enter key
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChat();
            }
        });
    }
    
    // Initial load
    generateScenarios();
    updateAuthUI();
    
    // Add welcome message
    addAIMessage('Welcome to FarmPulse! Set your farming constraints and I\'ll help you find the perfect strategy. 🌾');
    
    console.log('FarmPulse initialized successfully!');
});

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        authToken = await user.getIdToken();
        localStorage.setItem('firebase_token', authToken);
        updateAuthUI();
    } else {
        currentUser = null;
        authToken = null;
        localStorage.removeItem('firebase_token');
        updateAuthUI();
    }
});