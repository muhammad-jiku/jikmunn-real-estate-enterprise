/* eslint-disable @typescript-eslint/no-explicit-any */
// Test utilities for integration tests

// Mock data generators
export const mockProperty = {
  id: 1,
  name: 'Test Property',
  description: 'A beautiful test property',
  pricePerMonth: 1500,
  securityDeposit: 1500,
  applicationFee: 50,
  photoUrls: ['https://example.com/photo.jpg'],
  amenities: ['Pool', 'Gym'],
  highlights: ['HighSpeedInternetAccess'],
  isPetsAllowed: true,
  isParkingIncluded: true,
  beds: 2,
  baths: 1.5,
  squareFeet: 1000,
  propertyType: 'Apartment',
  averageRating: 4.5,
  numberOfReviews: 10,
  locationId: 1,
  managerCognitoId: 'manager-cognito-123',
};

export const mockLocation = {
  id: 1,
  address: '123 Test Street',
  city: 'Test City',
  state: 'TS',
  country: 'Test Country',
  postalCode: '12345',
  latitude: 34.0522,
  longitude: -118.2437,
};

export const mockTenant = {
  id: 1,
  name: 'Test Tenant',
  email: 'tenant@test.com',
  phoneNumber: '123-456-7890',
  cognitoId: 'tenant-cognito-123',
};

export const mockManager = {
  id: 1,
  name: 'Test Manager',
  email: 'manager@test.com',
  phoneNumber: '123-456-7890',
  cognitoId: 'manager-cognito-123',
};

export const mockApplication = {
  id: 1,
  applicationDate: new Date(),
  status: 'Pending',
  propertyId: 1,
  tenantCognitoId: 'tenant-cognito-123',
  name: 'Test Tenant',
  email: 'tenant@test.com',
  phoneNumber: '123-456-7890',
  message: 'I am interested in this property',
};

export const mockLease = {
  id: 1,
  startDate: new Date(),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  rent: 1500,
  deposit: 1500,
  propertyId: 1,
  tenantCognitoId: 'tenant-cognito-123',
};

// Helper to create mock request/response
interface MockRequestOverrides {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, any>;
  user?: { id: string; role: string };
}

export const mockRequest = (overrides: MockRequestOverrides = {}) => ({
  params: {} as Record<string, string>,
  query: {} as Record<string, string>,
  body: {} as Record<string, any>,
  user: {
    id: 'test-user-id',
    role: 'tenant',
  },
  ...overrides,
});

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('Test Utilities', () => {
  it('should create mock request', () => {
    const req = mockRequest({ params: { id: '1' } });
    expect(req.params.id).toBe('1');
  });

  it('should create mock response', () => {
    const res = mockResponse();
    res.status(200).json({ success: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('should have valid mock data', () => {
    expect(mockProperty.name).toBeDefined();
    expect(mockTenant.email).toBeDefined();
    expect(mockManager.cognitoId).toBeDefined();
  });
});
