import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation of the carbon credits contract
const CarbonCreditsContract = {
  transferCredits(recipient, amount, sender) {
    // Simplified mock implementation
    return { success: true };
  }
};

// Mock implementation of the carbon marketplace contract
const CarbonMarketplaceContract = {
  contractOwner: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  nextListingId: 0,
  carbonOffsets: new Map(),
  
  createListing(price, amount, sender) {
    const listingId = this.nextListingId++;
    this.carbonOffsets.set(listingId, {
      seller: sender,
      price,
      amount,
      available: true
    });
    return { success: true, value: listingId };
  },
  
  purchaseOffset(listingId, buyer) {
    const listing = this.carbonOffsets.get(listingId);
    if (!listing || !listing.available) throw new Error('ERR-NOT-FOUND');
    
    // Simplified STX transfer mock
    // In a real scenario, we'd check if the buyer has enough STX
    
    listing.available = false;
    return { success: true };
  },
  
  cancelListing(listingId, sender) {
    const listing = this.carbonOffsets.get(listingId);
    if (!listing || !listing.available) throw new Error('ERR-NOT-FOUND');
    if (listing.seller !== sender) throw new Error('ERR-NOT-AUTHORIZED');
    
    this.carbonOffsets.delete(listingId);
    return { success: true };
  },
  
  getListing(listingId) {
    return this.carbonOffsets.get(listingId) || null;
  },
  
  getNextListingId() {
    return this.nextListingId;
  }
};

describe('Carbon Marketplace Contract', () => {
  const seller = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const buyer = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  
  beforeEach(() => {
    CarbonMarketplaceContract.carbonOffsets.clear();
    CarbonMarketplaceContract.nextListingId = 0;
  });
  
  describe('Listing Management', () => {
    it('should create a new listing', () => {
      const result = CarbonMarketplaceContract.createListing(100, 50, seller);
      expect(result.success).toBe(true);
      expect(result.value).toBe(0);
      
      const listing = CarbonMarketplaceContract.getListing(0);
      expect(listing).toEqual({
        seller,
        price: 100,
        amount: 50,
        available: true
      });
    });
    
    it('should cancel a listing', () => {
      CarbonMarketplaceContract.createListing(100, 50, seller);
      const result = CarbonMarketplaceContract.cancelListing(0, seller);
      expect(result.success).toBe(true);
      
      const listing = CarbonMarketplaceContract.getListing(0);
      expect(listing).toBeNull();
    });
    
    it('should not allow unauthorized cancellation', () => {
      CarbonMarketplaceContract.createListing(100, 50, seller);
      expect(() => CarbonMarketplaceContract.cancelListing(0, buyer)).toThrow('ERR-NOT-AUTHORIZED');
    });
  });
  
  describe('Offset Purchasing', () => {
    beforeEach(() => {
      CarbonMarketplaceContract.createListing(100, 50, seller);
    });
    
    it('should allow purchasing an offset', () => {
      const result = CarbonMarketplaceContract.purchaseOffset(0, buyer);
      expect(result.success).toBe(true);
      
      const listing = CarbonMarketplaceContract.getListing(0);
      expect(listing.available).toBe(false);
    });
    
    it('should not allow purchasing a non-existent offset', () => {
      expect(() => CarbonMarketplaceContract.purchaseOffset(999, buyer)).toThrow('ERR-NOT-FOUND');
    });
    
    it('should not allow purchasing an already sold offset', () => {
      CarbonMarketplaceContract.purchaseOffset(0, buyer);
      expect(() => CarbonMarketplaceContract.purchaseOffset(0, buyer)).toThrow('ERR-NOT-FOUND');
    });
  });
  
  describe('Read-only Functions', () => {
    it('should return the correct next listing ID', () => {
      expect(CarbonMarketplaceContract.getNextListingId()).toBe(0);
      CarbonMarketplaceContract.createListing(100, 50, seller);
      expect(CarbonMarketplaceContract.getNextListingId()).toBe(1);
    });
    
    it('should return null for non-existent listings', () => {
      expect(CarbonMarketplaceContract.getListing(999)).toBeNull();
    });
  });
});

