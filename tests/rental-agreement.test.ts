import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract interactions
const mockAgreements = new Map();
const mockPropertyAgreements = new Map();
const mockContractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
let mockTxSender = mockContractOwner;

// Mock contract functions
const rentalAgreementContract = {
  createRentalAgreement: (agreementId, propertyId, tenant, startDate, endDate, monthlyRent, securityDeposit) => {
    if (mockTxSender !== mockContractOwner) {
      return { error: 101 };
    }
    
    mockAgreements.set(agreementId, {
      propertyId,
      tenant,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      active: true
    });
    
    mockPropertyAgreements.set(propertyId, { agreementId });
    
    return { success: true };
  },
  
  terminateAgreement: (agreementId) => {
    if (!mockAgreements.has(agreementId)) {
      return { error: 102 };
    }
    
    const agreement = mockAgreements.get(agreementId);
    
    if (mockTxSender !== mockContractOwner && mockTxSender !== agreement.tenant) {
      return { error: 103 };
    }
    
    agreement.active = false;
    mockAgreements.set(agreementId, agreement);
    
    return { success: true };
  },
  
  extendAgreement: (agreementId, newEndDate) => {
    if (!mockAgreements.has(agreementId)) {
      return { error: 104 };
    }
    
    if (mockTxSender !== mockContractOwner) {
      return { error: 105 };
    }
    
    const agreement = mockAgreements.get(agreementId);
    
    if (!agreement.active) {
      return { error: 106 };
    }
    
    agreement.endDate = newEndDate;
    mockAgreements.set(agreementId, agreement);
    
    return { success: true };
  },
  
  getAgreement: (agreementId) => {
    return mockAgreements.get(agreementId);
  },
  
  getPropertyAgreement: (propertyId) => {
    return mockPropertyAgreements.get(propertyId);
  },
  
  isAgreementActive: (agreementId) => {
    return mockAgreements.get(agreementId)?.active || false;
  }
};

describe('Rental Agreement Contract', () => {
  beforeEach(() => {
    mockAgreements.clear();
    mockPropertyAgreements.clear();
    mockTxSender = mockContractOwner;
  });
  
  it('should create a new rental agreement', () => {
    const result = rentalAgreementContract.createRentalAgreement(
        1, // agreementId
        101, // propertyId
        'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // tenant
        1000, // startDate
        2000, // endDate
        1500, // monthlyRent
        3000 // securityDeposit
    );
    
    expect(result.success).toBe(true);
    
    const agreement = rentalAgreementContract.getAgreement(1);
    expect(agreement).toBeDefined();
    expect(agreement.propertyId).toBe(101);
    expect(agreement.monthlyRent).toBe(1500);
    expect(agreement.active).toBe(true);
  });
  
  it('should fail to create agreement if not contract owner', () => {
    mockTxSender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    
    const result = rentalAgreementContract.createRentalAgreement(
        1, 101, 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 1000, 2000, 1500, 3000
    );
    
    expect(result.error).toBe(101);
  });
  
  it('should terminate an agreement', () => {
    rentalAgreementContract.createRentalAgreement(
        1, 101, 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 1000, 2000, 1500, 3000
    );
    
    const result = rentalAgreementContract.terminateAgreement(1);
    expect(result.success).toBe(true);
    
    const agreement = rentalAgreementContract.getAgreement(1);
    expect(agreement.active).toBe(false);
  });
  
  it('should allow tenant to terminate agreement', () => {
    rentalAgreementContract.createRentalAgreement(
        1, 101, 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 1000, 2000, 1500, 3000
    );
    
    mockTxSender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // tenant
    
    const result = rentalAgreementContract.terminateAgreement(1);
    expect(result.success).toBe(true);
    
    const agreement = rentalAgreementContract.getAgreement(1);
    expect(agreement.active).toBe(false);
  });
  
  it('should extend an agreement', () => {
    rentalAgreementContract.createRentalAgreement(
        1, 101, 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 1000, 2000, 1500, 3000
    );
    
    const result = rentalAgreementContract.extendAgreement(1, 3000);
    expect(result.success).toBe(true);
    
    const agreement = rentalAgreementContract.getAgreement(1);
    expect(agreement.endDate).toBe(3000);
  });
  
  it('should fail to extend inactive agreement', () => {
    rentalAgreementContract.createRentalAgreement(
        1, 101, 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 1000, 2000, 1500, 3000
    );
    
    rentalAgreementContract.terminateAgreement(1);
    
    const result = rentalAgreementContract.extendAgreement(1, 3000);
    expect(result.error).toBe(106);
  });
  
  it('should get property agreement', () => {
    rentalAgreementContract.createRentalAgreement(
        1, 101, 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 1000, 2000, 1500, 3000
    );
    
    const propertyAgreement = rentalAgreementContract.getPropertyAgreement(101);
    expect(propertyAgreement).toBeDefined();
    expect(propertyAgreement.agreementId).toBe(1);
  });
  
  it('should check if agreement is active', () => {
    rentalAgreementContract.createRentalAgreement(
        1, 101, 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 1000, 2000, 1500, 3000
    );
    
    expect(rentalAgreementContract.isAgreementActive(1)).toBe(true);
    
    rentalAgreementContract.terminateAgreement(1);
    expect(rentalAgreementContract.isAgreementActive(1)).toBe(false);
  });
});
