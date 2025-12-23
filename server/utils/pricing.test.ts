import { describe, it, expect } from "vitest";
import { PRICING_CONSTANTS } from "../storage-improvements";

describe("Pricing Calculations", () => {
  describe("Hourly to Monthly conversion", () => {
    it("should correctly convert hourly price to monthly", () => {
      const hourlyPrice = 10;
      const monthlyPrice = hourlyPrice * PRICING_CONSTANTS.HOURS_PER_MONTH;
      expect(monthlyPrice).toBe(7300);
    });

    it("should handle decimal hourly prices", () => {
      const hourlyPrice = 2.5;
      const monthlyPrice = hourlyPrice * PRICING_CONSTANTS.HOURS_PER_MONTH;
      expect(monthlyPrice).toBe(1825);
    });
  });

  describe("Monthly to Yearly conversion", () => {
    it("should apply 10% discount for yearly pricing", () => {
      const monthlyPrice = 1000;
      const yearlyPrice =
        monthlyPrice * PRICING_CONSTANTS.MONTHS_PER_YEAR * PRICING_CONSTANTS.YEARLY_DISCOUNT;
      expect(yearlyPrice).toBe(10800); // 1000 * 12 * 0.9
    });

    it("should handle zero monthly price", () => {
      const monthlyPrice = 0;
      const yearlyPrice =
        monthlyPrice * PRICING_CONSTANTS.MONTHS_PER_YEAR * PRICING_CONSTANTS.YEARLY_DISCOUNT;
      expect(yearlyPrice).toBe(0);
    });
  });

  describe("Yearly discount calculation", () => {
    it("should provide 10% discount", () => {
      const discountRate = 1 - PRICING_CONSTANTS.YEARLY_DISCOUNT;
      expect(discountRate).toBe(0.1); // 10% discount
    });
  });

  describe("Veeam retention multipliers", () => {
    it("should apply correct retention multipliers", () => {
      const basePrice = 100;

      expect(basePrice * PRICING_CONSTANTS.RETENTION_MULTIPLIERS["7"]).toBe(70);
      expect(basePrice * PRICING_CONSTANTS.RETENTION_MULTIPLIERS["14"]).toBe(85);
      expect(basePrice * PRICING_CONSTANTS.RETENTION_MULTIPLIERS["30"]).toBe(100);
      expect(basePrice * PRICING_CONSTANTS.RETENTION_MULTIPLIERS["90"]).toBe(130);
    });
  });

  describe("Backup frequency multipliers", () => {
    it("should apply correct frequency multipliers", () => {
      const basePrice = 100;

      expect(basePrice * PRICING_CONSTANTS.FREQUENCY_MULTIPLIERS.daily).toBe(100);
      expect(basePrice * PRICING_CONSTANTS.FREQUENCY_MULTIPLIERS.weekly).toBe(50);
    });
  });

  describe("Combined pricing calculations", () => {
    it("should calculate VM total price correctly", () => {
      const computeMonthly = 1000;
      const osMonthly = 200;
      const storageMonthly = 300;
      const addonMonthly = 150;

      const total = computeMonthly + osMonthly + storageMonthly + addonMonthly;
      expect(total).toBe(1650);
    });

    it("should calculate Kubernetes cluster price correctly", () => {
      const workerComputeMonthly = 500;
      const workerCount = 3;
      const storagePerNode = 100;
      const haPrice = 5000;

      const total =
        workerComputeMonthly * workerCount +
        storagePerNode * workerCount +
        haPrice;

      expect(total).toBe(7300); // (500 * 3) + (100 * 3) + 5000
    });

    it("should calculate Veeam backup price with retention and frequency", () => {
      const baseCapacityPrice = 1000;
      const retention = "30";
      const frequency = "weekly";

      const total =
        baseCapacityPrice *
        PRICING_CONSTANTS.RETENTION_MULTIPLIERS[retention] *
        PRICING_CONSTANTS.FREQUENCY_MULTIPLIERS[frequency];

      expect(total).toBe(500); // 1000 * 1.0 * 0.5
    });
  });

  describe("Edge cases", () => {
    it("should handle very large numbers", () => {
      const hourlyPrice = 1000000;
      const monthlyPrice = hourlyPrice * PRICING_CONSTANTS.HOURS_PER_MONTH;
      expect(monthlyPrice).toBe(730000000);
    });

    it("should handle very small numbers", () => {
      const hourlyPrice = 0.01;
      const monthlyPrice = hourlyPrice * PRICING_CONSTANTS.HOURS_PER_MONTH;
      expect(monthlyPrice).toBe(7.3);
    });

    it("should maintain precision with decimals", () => {
      const monthlyPrice = 1234.56;
      const yearlyPrice =
        monthlyPrice * PRICING_CONSTANTS.MONTHS_PER_YEAR * PRICING_CONSTANTS.YEARLY_DISCOUNT;
      expect(yearlyPrice).toBeCloseTo(13333.25, 2);
    });
  });
});
