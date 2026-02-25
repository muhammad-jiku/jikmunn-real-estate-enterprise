import { cn } from './utils';

describe('cn utility function', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toContain('base');
    expect(result).toContain('active');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'valid');
    expect(result).toContain('base');
    expect(result).toContain('valid');
    expect(result).not.toContain('undefined');
    expect(result).not.toContain('null');
  });

  it('should merge Tailwind classes correctly', () => {
    // Later classes should override earlier ones for conflicting utilities
    const result = cn('p-4', 'p-2');
    expect(result).toContain('p-2');
  });
});
