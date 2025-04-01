import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract interactions
const mockPropertyTokens = new Map();
const mockRentPayments = new Map();
const mockTokenBalances = new Map();
const mockContractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
let mockTxSender = mockContractOwner;

// Mock contract functions
const incomeDistributionContract = {
  createPropertyTokens: (propertyId, totalSupply, tokenPrice) => {
    if (mockTxSender !== mockContractOwner) {
      return { error: 101 };
    }
    
    mockPropertyTokens.set(propertyId, {
      totalSupply,
      tokenPrice,
      totalDistributed: 0
    });
    
    // Mint tokens to contract owner
    mockTokenBalances.set(mockContractOwner, totalSupply);
    
    return { success: true };
  },
  
  purchaseTokens: (propertyId, amount) => {
    if (!mockPropertyTokens.has(propertyId)) {
      return { error: 102 };
    }
    
    const tokenInfo = mockPropertyTokens.get(propertyId);
    const price = amount * tokenInfo.tokenPrice;
    
    // Transfer tokens from owner to buyer
    const ownerBalance = mockTokenBalances.get(mockContractOwner) || 0;
    if (ownerBalance < amount) {
      return { error: 103 };
    }
    
    mockTokenBalances.set(mockContractOwner, ownerBalance - amount);
    mockTokenBalances.set(mockTxSender, (mockTokenBalances.get(mockTxSender) || 0) + amount);
    
    return { success: true };
  },
  
  recordRentPayment: (paymentId, propertyId, amount) => {
    if (mockTxSender !== mockContractOwner) {
      return { error: 103 };
    }
    
    mockRentPayments.set(paymentId, {
      propertyId,
      amount,
      paymentDate: 123, // Mock block height
      distributed: false
    });
    
    return { success: true };
  },
  
  distributePayment: (paymentId) => {
    if (!mockRentPayments.has(paymentId)) {
      return { error: 104 };
    }
    
    if (mockTxSender !== mockContractOwner) {
      return { error: 106 };
    }
    
    const payment = mockRentPayments.get(paymentId);
    
    if (!mockPropertyTokens.has(payment.propertyId)) {
      return { error: 105 };
    }
    
    if (payment.distributed) {
      return { error: 107 };
    }
    
    // Mark payment as distributed
    payment.distributed = true;
    mockRentPayments.set(paymentId, payment);
    
    // Update total distributed
    const tokenInfo = mockPropertyTokens.get(payment.propertyId);
    tokenInfo.totalDistributed += payment.amount;
    mockPropertyTokens.set(payment.propertyId, tokenInfo);
    
    return { success: true };
  },
  
  getPropertyTokenInfo: (propertyId) => {
    return mockPropertyTokens.get(propertyId);
  },
  
  getPaymentInfo: (paymentId) => {
    return mockRentPayments.get(paymentId);
  },
  
  getTokenBalance: (address) => {
    return mockTokenBalances.get(address) || 0;
  }
};

describe('Income Distribution Contract', () => {
  beforeEach(() => {
    mockPropertyTokens.clear();
    mockRentPayments.clear();
    mockTokenBalances.clear();
    mockTxSender = mockContractOwner;
  });
  
  it('should create property tokens', () => {
    const result = incomeDistributionContract.createPropertyTokens(101, 1000, 50);
    expect(result.success).toBe(true);
    
    const tokenInfo = incomeDistributionContract.getPropertyTokenInfo(101);
    expect(tokenInfo).toBeDefined();
    expect(tokenInfo.totalSupply).toBe(1000);
    expect(tokenInfo.tokenPrice).toBe(50);
    expect(tokenInfo.totalDistributed).toBe(0);
  });
  
  it('should fail to create tokens if not contract owner', () => {
    mockTxSender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const result = incomeDistributionContract.createPropertyTokens(101, 1000, 50);
    expect(result.error).toBe(101);
  });
  
  it('should purchase tokens', () => {
    incomeDistributionContract.createPropertyTokens(101, 1000, 50);
    
    mockTxSender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const result = incomeDistributionContract.purchaseTokens(101, 100);
    
    expect(result.success).toBe(true);
    expect(incomeDistributionContract.getTokenBalance(mockTxSender)).toBe(100);
    expect(incomeDistributionContract.getTokenBalance(mockContractOwner)).toBe(900);
  });
  
  it('should record rent payment', () => {
    const result = incomeDistributionContract.recordRentPayment(1, 101, 5000);
    expect(result.success).toBe(true);
    
    const payment = incomeDistributionContract.getPaymentInfo(1);
    expect(payment).toBeDefined();
    expect(payment.amount).toBe(5000);
    expect(payment.distributed).toBe(false);
  });
  
  it('should distribute payment', () => {
    incomeDistributionContract.createPropertyTokens(101, 1000, 50);
    incomeDistributionContract.recordRentPayment(1, 101, 5000);
    
    const result = incomeDistributionContract.distributePayment(1);
    expect(result.success).toBe(true);
    
    const payment = incomeDistributionContract.getPaymentInfo(1);
    expect(payment.distributed).toBe(true);
    
    const tokenInfo = incomeDistributionContract.getPropertyTokenInfo(101);
    expect(tokenInfo.totalDistributed).toBe(5000);
  });
  
  it('should fail to distribute already distributed payment', () => {
    incomeDistributionContract.createPropertyTokens(101, 1000, 50);
    incomeDistributionContract.recordRentPayment(1, 101, 5000);
    incomeDistributionContract.distributePayment(1);
    
    const result = incomeDistributionContract.distributePayment(1);
    expect(result.error).toBe(107);
  });
});
