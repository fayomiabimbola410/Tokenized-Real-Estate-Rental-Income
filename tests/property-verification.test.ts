import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract interactions
const mockProperties = new Map();
const mockContractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
let mockTxSender = mockContractOwner;

// Mock contract functions
const propertyVerificationContract = {
  registerProperty: (propertyId, address) => {
    if (mockTxSender !== mockContractOwner) {
      return { error: 101 };
    }
    
    mockProperties.set(propertyId, {
      owner: mockTxSender,
      verified: false,
      address,
      lastInspectionDate: 0,
      conditionScore: 0
    });
    
    return { success: true };
  },
  
  verifyProperty: (propertyId, conditionScore) => {
    if (mockTxSender !== mockContractOwner) {
      return { error: 103 };
    }
    
    if (!mockProperties.has(propertyId)) {
      return { error: 102 };
    }
    
    const property = mockProperties.get(propertyId);
    property.verified = true;
    property.lastInspectionDate = 123; // Mock block height
    property.conditionScore = conditionScore;
    mockProperties.set(propertyId, property);
    
    return { success: true };
  },
  
  getProperty: (propertyId) => {
    return mockProperties.get(propertyId);
  },
  
  isPropertyVerified: (propertyId) => {
    return mockProperties.get(propertyId)?.verified || false;
  },
  
  transferPropertyOwnership: (propertyId, newOwner) => {
    if (!mockProperties.has(propertyId)) {
      return { error: 104 };
    }
    
    const property = mockProperties.get(propertyId);
    
    if (mockTxSender !== property.owner) {
      return { error: 105 };
    }
    
    property.owner = newOwner;
    mockProperties.set(propertyId, property);
    
    return { success: true };
  }
};

describe('Property Verification Contract', () => {
  beforeEach(() => {
    mockProperties.clear();
    mockTxSender = mockContractOwner;
  });
  
  it('should register a new property', () => {
    const result = propertyVerificationContract.registerProperty(1, '123 Main St');
    expect(result.success).toBe(true);
    
    const property = propertyVerificationContract.getProperty(1);
    expect(property).toBeDefined();
    expect(property.address).toBe('123 Main St');
    expect(property.verified).toBe(false);
  });
  
  it('should fail to register property if not contract owner', () => {
    mockTxSender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const result = propertyVerificationContract.registerProperty(1, '123 Main St');
    expect(result.error).toBe(101);
  });
  
  it('should verify a property', () => {
    propertyVerificationContract.registerProperty(1, '123 Main St');
    const result = propertyVerificationContract.verifyProperty(1, 85);
    
    expect(result.success).toBe(true);
    
    const property = propertyVerificationContract.getProperty(1);
    expect(property.verified).toBe(true);
    expect(property.conditionScore).toBe(85);
  });
  
  it('should check if property is verified', () => {
    propertyVerificationContract.registerProperty(1, '123 Main St');
    expect(propertyVerificationContract.isPropertyVerified(1)).toBe(false);
    
    propertyVerificationContract.verifyProperty(1, 85);
    expect(propertyVerificationContract.isPropertyVerified(1)).toBe(true);
  });
  
  it('should transfer property ownership', () => {
    const newOwner = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    
    propertyVerificationContract.registerProperty(1, '123 Main St');
    const result = propertyVerificationContract.transferPropertyOwnership(1, newOwner);
    
    expect(result.success).toBe(true);
    
    const property = propertyVerificationContract.getProperty(1);
    expect(property.owner).toBe(newOwner);
  });
  
  it('should fail to transfer property if not the owner', () => {
    propertyVerificationContract.registerProperty(1, '123 Main St');
    mockTxSender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    
    const result = propertyVerificationContract.transferPropertyOwnership(
        1,
        'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
    );
    
    expect(result.error).toBe(105);
  });
});
