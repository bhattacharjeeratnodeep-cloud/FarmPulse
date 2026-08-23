# 🌾 FarmPulse - Smart Farming Decision Engine

## 🚀 Overview
FarmPulse is an AI-powered agricultural decision support system that helps farmers make optimal decisions by balancing profit, productivity, and environmental sustainability.

## ✨ Features
- 🔐 **Firebase Authentication** (Google + Email)
- 📊 **AI Decision Engine** for farming strategies
- 🌱 **Regenerative Score** tracking
- 💰 **Profit Optimization** with constraints
- 🤖 **AI Chat Assistant** for farming advice
- 📱 **Responsive Design** for all devices

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Firebase Hosting, Firebase Functions
- **Database**: Supabase (PostgreSQL)
- **Auth**: Firebase Authentication
- **Deployment**: Firebase Hosting

## 📋 Setup Instructions

### 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project called `farmpulse`
3. Enable Authentication (Google + Email)
4. Create a web app and copy config

### 2. Supabase Setup
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Run the SQL schema (see `supabase_schema.sql`)
4. Copy credentials

### 3. Local Development
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/farmpulse.git
cd farmpulse

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy to Firebase
firebase deploy

# Or run locally
firebase serve