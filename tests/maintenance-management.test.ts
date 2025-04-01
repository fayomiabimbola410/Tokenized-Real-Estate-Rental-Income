import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract interactions
const mockMaintenanceRequests = new Map();
const mockMaintenanceFunds = new Map();
const mockContractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
let mockTxSender = mockContractOwner;

// Mock contract functions
const maintenanceManagementContract = {
  createMaintenanceFund: (propertyId, initialBalance) => {
    if (mockTxSender !== mockContractOwner) {
      return { error: 101 };
    }
    
    mockMaintenanceFunds.set(propertyId, {
      balance: initialBalance,
      totalSpent: 0
    });
    
    return { success: true };
  },
  
  addToMaintenanceFund: (propertyId, amount) => {
    if (!mockMaintenanceFunds.has(propertyId)) {
      return { error: 102 };
    }
    
    if (mockTxSender !== mockContractOwner) {
      return { error: 103 };
    }
    
    const fund = mockMaintenanceFunds.get(propertyId);
    fund.balance += amount;
    mockMaintenanceFunds.set(propertyId, fund);
    
    return { success: true };
  },
  
  submitMaintenanceRequest: (requestId, propertyId, description, estimatedCost) => {
    mockMaintenanceRequests.set(requestId, {
      propertyId,
      description,
      estimatedCost,
      actualCost: 0,
      status: 'pending',
      requestDate: 123, // Mock block height
      completionDate: 0
    });
    
    return { success: true };
  },
  
  approveMaintenanceRequest: (requestId) => {
    if (!mockMaintenanceRequests.has(requestId)) {
      return { error: 104 };
    }
    
    if (mockTxSender !== mockContractOwner) {
      return { error: 105 };
    }
    
    const request = mockMaintenanceRequests.get(requestId);
    
    if (request.status !== 'pending') {
      return { error: 106 };
    }
    
    request.status = 'approved';
    mockMaintenanceRequests.set(requestId, request);
    
    return { success: true };
  },
  
  completeMaintenanceRequest: (requestId, actualCost) => {
    if (!mockMaintenanceRequests.has(requestId)) {
      return { error: 107 };
    }
    
    if (mockTxSender !== mockContractOwner) {
      return { error: 109 };
    }
    
    const request = mockMaintenanceRequests.get(requestId);
    
    if (request.status !== 'approved') {
      return { error: 110 };
    }
    
    if (!mockMaintenanceFunds.has(request.propertyId)) {
      return { error: 108 };
    }
    
    const fund = mockMaintenanceFunds.get(request.propertyId);
    
    if (fund.balance < actualCost) {
      return { error: 111 };
    }
    
    // Update request
    request.status = 'completed';
    request.actualCost = actualCost;
    request.completionDate = 456; // Mock block height
    mockMaintenanceRequests.set(requestId, request);
    
    // Update fund
    fund.balance -= actualCost;
    fund.totalSpent += actualCost;
    mockMaintenanceFunds.set(request.propertyId, fund);
    
    return { success: true };
  },
  
  rejectMaintenanceRequest: (requestId) => {
    if (!mockMaintenanceRequests.has(requestId)) {
      return { error: 112 };
    }
    
    if (mockTxSender !== mockContractOwner) {
      return { error: 113 };
    }
    
    const request = mockMaintenanceRequests.get(requestId);
    
    if (request.status !== 'pending') {
      return { error: 114 };
    }
    
    request.status = 'rejected';
    mockMaintenanceRequests.set(requestId, request);
    
    return { success: true };
  },
  
  getMaintenanceRequest: (requestId) => {
    return mockMaintenanceRequests.get(requestId);
  },
  
  getMaintenanceFund: (propertyId) => {
    return mockMaintenanceFunds.get(propertyId);
  }
};

describe('Maintenance Management Contract', () => {
  beforeEach(() => {
    mockMaintenanceRequests.clear();
    mockMaintenanceFunds.clear();
    mockTxSender = mockContractOwner;
  });
  
  it('should create a maintenance fund', () => {
    const result = maintenanceManagementContract.createMaintenanceFund(101, 10000);
    expect(result.success).toBe(true);
    
    const fund = maintenanceManagementContract.getMaintenanceFund(101);
    expect(fund).toBeDefined();
    expect(fund.balance).toBe(10000);
    expect(fund.totalSpent).toBe(0);
  });
  
  it('should add to maintenance fund', () => {
    maintenanceManagementContract.createMaintenanceFund(101, 10000);
    const result = maintenanceManagementContract.addToMaintenanceFund(101, 5000);
    
    expect(result.success).toBe(true);
    
    const fund = maintenanceManagementContract.getMaintenanceFund(101);
    expect(fund.balance).toBe(15000);
  });
  
  it('should submit a maintenance request', () => {
    const result = maintenanceManagementContract.submitMaintenanceRequest(
        1, 101, 'Fix leaky roof', 2000
    );
    
    expect(result.success).toBe(true);
    
    const request = maintenanceManagementContract.getMaintenanceRequest(1);
    expect(request).toBeDefined();
    expect(request.description).toBe('Fix leaky roof');
    expect(request.status).toBe('pending');
  });
  
  it('should approve a maintenance request', () => {
    maintenanceManagementContract.submitMaintenanceRequest(1, 101, 'Fix leaky roof', 2000);
    const result = maintenanceManagementContract.approveMaintenanceRequest(1);
    
    expect(result.success).toBe(true);
    
    const request = maintenanceManagementContract.getMaintenanceRequest(1);
    expect(request.status).toBe('approved');
  });
  
  it('should complete a maintenance request', () => {
    maintenanceManagementContract.createMaintenanceFund(101, 10000);
    maintenanceManagementContract.submitMaintenanceRequest(1, 101, 'Fix leaky roof', 2000);
    maintenanceManagementContract.approveMaintenanceRequest(1);
    
    const result = maintenanceManagementContract.completeMaintenanceRequest(1, 1800);
    expect(result.success).toBe(true);
    
    const request = maintenanceManagementContract.getMaintenanceRequest(1);
    expect(request.status).toBe('completed');
    expect(request.actualCost).toBe(1800);
    
    const fund = maintenanceManagementContract.getMaintenanceFund(101);
    expect(fund.balance).toBe(8200);
    expect(fund.totalSpent).toBe(1800);
  });
  
  it('should fail to complete request if insufficient funds', () => {
    maintenanceManagementContract.createMaintenanceFund(101, 1000);
    maintenanceManagementContract.submitMaintenanceRequest(1, 101, 'Fix leaky roof', 2000);
    maintenanceManagementContract.approveMaintenanceRequest(1);
    
    const result = maintenanceManagementContract.completeMaintenanceRequest(1, 1800);
    expect(result.error).toBe(111);
  });
  
  it('should reject a maintenance request', () => {
    maintenanceManagementContract.submitMaintenanceRequest(1, 101, 'Fix leaky roof', 2000);
    const result = maintenanceManagementContract.rejectMaintenanceRequest(1);
    
    expect(result.success).toBe(true);
    
    const request = maintenanceManagementContract.getMaintenanceRequest(1);
    expect(request.status).toBe('rejected');
  });
});
