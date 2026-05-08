#!/usr/bin/env node

/**
 * Database Migration Script - Initialize Wallet & Payment System
 * Run this script ONCE to initialize all database models and indexes
 * 
 * Usage: node setup-wallet-migration.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Import all models
const ProfessionalWallet = require('./models/ProfessionalWallet');
const BankDetails = require('./models/BankDetails');
const Transaction = require('./models/Transaction');
const Payment = require('./models/Payment');
const Refund = require('./models/Refund');
const AdminWallet = require('./models/AdminWallet');

const DB_URI = process.env.MONGODB_URI;

async function runMigration() {
  try {
    console.log('🔄 Starting Database Migration for Wallet & Payment System...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected\n');

    // Create indexes for each model
    console.log('📑 Creating database indexes...\n');

    // ProfessionalWallet indexes
    console.log('  Creating ProfessionalWallet indexes...');
    await ProfessionalWallet.collection.createIndex({ professionalId: 1 });
    await ProfessionalWallet.collection.createIndex({ userId: 1 });
    await ProfessionalWallet.collection.createIndex({ status: 1 });
    console.log('  ✅ ProfessionalWallet indexes created');

    // BankDetails indexes
    console.log('  Creating BankDetails indexes...');
    await BankDetails.collection.createIndex({ professionalId: 1 });
    await BankDetails.collection.createIndex({ userId: 1 });
    await BankDetails.collection.createIndex({ verificationStatus: 1 });
    console.log('  ✅ BankDetails indexes created');

    // Transaction indexes
    console.log('  Creating Transaction indexes...');
    await Transaction.collection.createIndex({ professionalId: 1, createdAt: -1 });
    await Transaction.collection.createIndex({ walletId: 1 });
    await Transaction.collection.createIndex({ type: 1 });
    await Transaction.collection.createIndex({ status: 1 });
    await Transaction.collection.createIndex({ referenceId: 1 });
    console.log('  ✅ Transaction indexes created');

    // Payment indexes
    console.log('  Creating Payment indexes...');
    await Payment.collection.createIndex({ userId: 1, createdAt: -1 });
    await Payment.collection.createIndex({ referenceType: 1, referenceId: 1 });
    await Payment.collection.createIndex({ razorpayOrderId: 1 });
    await Payment.collection.createIndex({ status: 1 });
    await Payment.collection.createIndex({ professionalId: 1 });
    console.log('  ✅ Payment indexes created');

    // Refund indexes
    console.log('  Creating Refund indexes...');
    await Refund.collection.createIndex({ userId: 1, createdAt: -1 });
    await Refund.collection.createIndex({ paymentId: 1 });
    await Refund.collection.createIndex({ status: 1 });
    await Refund.collection.createIndex({ referenceId: 1 });
    await Refund.collection.createIndex({ professionalId: 1 });
    console.log('  ✅ Refund indexes created');

    // AdminWallet indexes
    console.log('  Creating AdminWallet indexes...');
    await AdminWallet.collection.createIndex({ adminId: 1 });
    await AdminWallet.collection.createIndex({ status: 1 });
    console.log('  ✅ AdminWallet indexes created');

    console.log('\n✅ All database indexes created successfully!\n');

    // Initialize collection data
    console.log('🚀 Initializing default collections...\n');

    // Create default admin wallet if not exists
    const adminId = process.env.ADMIN_ID || 'system-admin-1';
    const existingAdminWallet = await AdminWallet.findOne({ adminId });
    
    if (!existingAdminWallet) {
      const adminWallet = new AdminWallet({
        adminId,
        totalBalance: 0,
        totalCommissionReceived: 0,
        totalCashCollected: 0,
        commissionBreakdown: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          thisYear: 0
        },
        cashBreakdown: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          thisYear: 0
        }
      });
      
      await adminWallet.save();
      console.log('  ✅ Default AdminWallet created for system admin\n');
    } else {
      console.log('  ℹ️  AdminWallet already exists, skipping creation\n');
    }

    // Verify all models are working
    console.log('🔍 Verifying all models...\n');
    
    const collections = {
      'ProfessionalWallet': ProfessionalWallet,
      'BankDetails': BankDetails,
      'Transaction': Transaction,
      'Payment': Payment,
      'Refund': Refund,
      'AdminWallet': AdminWallet
    };

    for (const [name, model] of Object.entries(collections)) {
      try {
        const count = await model.countDocuments();
        console.log(`  ✅ ${name}: ${count} documents`);
      } catch (err) {
        console.log(`  ⚠️  ${name}: Error counting documents - ${err.message}`);
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log('  - 6 models initialized');
    console.log('  - All indexes created');
    console.log('  - Default admin wallet created');
    console.log('  - System ready for use\n');
    console.log('🚀 Ready to start the server!\n');

  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
runMigration();
