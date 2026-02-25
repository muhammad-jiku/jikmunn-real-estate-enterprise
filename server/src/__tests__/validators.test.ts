import { z } from 'zod';

// Example validation schemas (should match your actual validators)
const createPropertySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    pricePerMonth: z.number().positive(),
    beds: z.number().int().positive(),
    baths: z.number().positive(),
    squareFeet: z.number().int().positive(),
  }),
});

const createApplicationSchema = z.object({
  body: z.object({
    propertyId: z.number().int().positive(),
    tenantCognitoId: z.string().min(1),
  }),
});

describe('Validation Schemas', () => {
  describe('Property Schema', () => {
    it('should validate a valid property', () => {
      const validProperty = {
        body: {
          name: 'Test Property',
          description: 'A nice property',
          pricePerMonth: 1500,
          beds: 2,
          baths: 1.5,
          squareFeet: 1000,
        },
      };

      const result = createPropertySchema.safeParse(validProperty);
      expect(result.success).toBe(true);
    });

    it('should reject invalid property - missing name', () => {
      const invalidProperty = {
        body: {
          name: '',
          description: 'A nice property',
          pricePerMonth: 1500,
          beds: 2,
          baths: 1.5,
          squareFeet: 1000,
        },
      };

      const result = createPropertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const invalidProperty = {
        body: {
          name: 'Test Property',
          description: 'A nice property',
          pricePerMonth: -100,
          beds: 2,
          baths: 1.5,
          squareFeet: 1000,
        },
      };

      const result = createPropertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
    });
  });

  describe('Application Schema', () => {
    it('should validate a valid application', () => {
      const validApplication = {
        body: {
          propertyId: 1,
          tenantCognitoId: 'cognito-123',
        },
      };

      const result = createApplicationSchema.safeParse(validApplication);
      expect(result.success).toBe(true);
    });

    it('should reject invalid propertyId', () => {
      const invalidApplication = {
        body: {
          propertyId: -1,
          tenantCognitoId: 'cognito-123',
        },
      };

      const result = createApplicationSchema.safeParse(invalidApplication);
      expect(result.success).toBe(false);
    });
  });
});
