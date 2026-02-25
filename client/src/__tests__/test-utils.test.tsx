import { api } from '@/state/api';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

// Create a test store
const createTestStore = () =>
  configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  });

// Wrapper component for tests that need Redux
export const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createTestStore();
  return <Provider store={store}>{children}</Provider>;
};

describe('Test Utils', () => {
  it('should create a test store', () => {
    const store = createTestStore();
    expect(store).toBeDefined();
    expect(store.getState()).toHaveProperty(api.reducerPath);
  });
});
