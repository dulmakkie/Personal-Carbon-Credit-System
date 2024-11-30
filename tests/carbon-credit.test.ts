import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation of the carbon credits contract
const CarbonCreditsContract = {
  contractOwner: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  blockHeight: 0,
  baseCreditRate: 1000,
  creditMultiplier: 100,
  
  userCredits: new Map(),
  iotDevices: new Map(),
  
  // Helper function to simulate block height changes
  incrementBlockHeight(blocks = 1) {
    this.blockHeight += blocks;
  },
  
  // Contract functions
  registerUser(sender) {
    this.userCredits.set(sender, {
      balance: 0,
      lastClaim: this.blockHeight,
      energyScore: 100,
      transportScore: 100
    });
    return { success: true };
  },
  
  registerDevice(deviceId, deviceType, sender) {
    const key = `${deviceId}-${sender}`;
    this.iotDevices.set(key, {
      deviceType,
      active: true,
      lastReading: 0
    });
    return { success: true };
  },
  
  updateDeviceReading(deviceId, reading, sender) {
    const key = `${deviceId}-${sender}`;
    const device = this.iotDevices.get(key);
    if (!device) throw new Error('ERR-DEVICE-NOT-FOUND');
    
    const userData = this.userCredits.get(sender);
    if (!userData) throw new Error('ERR-USER-NOT-FOUND');
    
    if (device.deviceType === 'energy') {
      userData.energyScore = reading;
    } else {
      userData.transportScore = reading;
    }
    
    device.lastReading = reading;
    return { success: true };
  },
  
  claimCredits(sender) {
    const userData = this.userCredits.get(sender);
    if (!userData) throw new Error('ERR-USER-NOT-FOUND');
    
    if (this.blockHeight - userData.lastClaim < 144) {
      throw new Error('ERR-NOT-AUTHORIZED');
    }
    
    const energyBonus = (userData.energyScore * this.creditMultiplier) / 100;
    const transportBonus = (userData.transportScore * this.creditMultiplier) / 100;
    const totalCredits = this.baseCreditRate + energyBonus + transportBonus;
    
    userData.balance += totalCredits;
    userData.lastClaim = this.blockHeight;
    
    return { success: true };
  },
  
  transferCredits(recipient, amount, sender) {
    const senderData = this.userCredits.get(sender);
    if (!senderData) throw new Error('ERR-USER-NOT-FOUND');
    
    const recipientData = this.userCredits.get(recipient);
    if (!recipientData) throw new Error('ERR-USER-NOT-FOUND');
    
    if (senderData.balance < amount) throw new Error('ERR-INSUFFICIENT-CREDITS');
    
    senderData.balance -= amount;
    recipientData.balance += amount;
    
    return { success: true };
  },
  
  getUserCredits(user) {
    return this.userCredits.get(user) || null;
  },
  
  getDeviceInfo(deviceId, user) {
    const key = `${deviceId}-${user}`;
    return this.iotDevices.get(key) || null;
  }
};

describe('Carbon Credits Contract', () => {
  const user1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const user2 = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  
  beforeEach(() => {
    CarbonCreditsContract.userCredits.clear();
    CarbonCreditsContract.iotDevices.clear();
    CarbonCreditsContract.blockHeight = 0;
  });
  
  describe('User Registration', () => {
    it('should register a new user', () => {
      const result = CarbonCreditsContract.registerUser(user1);
      expect(result.success).toBe(true);
      
      const userData = CarbonCreditsContract.getUserCredits(user1);
      expect(userData.balance).toBe(0);
      expect(userData.energyScore).toBe(100);
      expect(userData.transportScore).toBe(100);
    });
  });
  
  describe('Device Management', () => {
    beforeEach(() => {
      CarbonCreditsContract.registerUser(user1);
    });
    
    it('should register a new device', () => {
      const result = CarbonCreditsContract.registerDevice('device1', 'energy', user1);
      expect(result.success).toBe(true);
      
      const deviceInfo = CarbonCreditsContract.getDeviceInfo('device1', user1);
      expect(deviceInfo.deviceType).toBe('energy');
      expect(deviceInfo.active).toBe(true);
    });
    
    it('should update device readings', () => {
      CarbonCreditsContract.registerDevice('device1', 'energy', user1);
      const result = CarbonCreditsContract.updateDeviceReading('device1', 90, user1);
      expect(result.success).toBe(true);
      
      const userData = CarbonCreditsContract.getUserCredits(user1);
      expect(userData.energyScore).toBe(90);
    });
  });
  
  describe('Credit Management', () => {
    beforeEach(() => {
      CarbonCreditsContract.registerUser(user1);
      CarbonCreditsContract.registerUser(user2);
    });
    
    it('should claim credits after required period', () => {
      CarbonCreditsContract.incrementBlockHeight(144);
      const result = CarbonCreditsContract.claimCredits(user1);
      expect(result.success).toBe(true);
      
      const userData = CarbonCreditsContract.getUserCredits(user1);
      expect(userData.balance).toBeGreaterThan(0);
    });
    
    it('should not claim credits before required period', () => {
      expect(() => CarbonCreditsContract.claimCredits(user1)).toThrow('ERR-NOT-AUTHORIZED');
    });
    
    it('should transfer credits between users', () => {
      CarbonCreditsContract.incrementBlockHeight(144);
      CarbonCreditsContract.claimCredits(user1);
      
      const initialBalance = CarbonCreditsContract.getUserCredits(user1).balance;
      const transferAmount = Math.floor(initialBalance / 2);
      
      const result = CarbonCreditsContract.transferCredits(user2, transferAmount, user1);
      expect(result.success).toBe(true);
      
      const user1Final = CarbonCreditsContract.getUserCredits(user1);
      const user2Final = CarbonCreditsContract.getUserCredits(user2);
      
      expect(user1Final.balance).toBe(initialBalance - transferAmount);
      expect(user2Final.balance).toBe(transferAmount);
    });
    
    it('should not transfer more credits than available', () => {
      expect(() => CarbonCreditsContract.transferCredits(user2, 1000, user1))
          .toThrow('ERR-INSUFFICIENT-CREDITS');
    });
  });
});

