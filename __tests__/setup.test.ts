// __tests__/setup.test.ts
/**
 * Basic test to verify Jest and testing setup is working correctly
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from './utils/test-helpers';
import { mockApiResponse, createTestView } from './utils/test-helpers';

describe('Testing Framework Setup', () => {
  it('should run basic Jest tests', () => {
    expect(1 + 1).toBe(2);
    expect(true).toBe(true);
  });

  it('should have Jest DOM matchers available', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);
    
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
  });

  it('should mock fetch globally', () => {
    expect(global.fetch).toBeDefined();
    expect(jest.isMockFunction(global.fetch)).toBe(true);
  });

  it('should mock AbortController globally', () => {
    expect(global.AbortController).toBeDefined();
    const controller = new global.AbortController();
    expect(controller.abort).toBeDefined();
    expect(controller.signal).toBeDefined();
  });

  it('should provide API response mocking utilities', () => {
    const mockData = { id: 1, name: 'test' };
    const mockFn = mockApiResponse(mockData);
    
    expect(jest.isMockFunction(mockFn)).toBe(true);
  });

  it('should provide ProseMirror test helpers', () => {
    const view = createTestView();
    
    expect(view.state).toBeDefined();
    expect(view.dispatch).toBeDefined();
    expect(jest.isMockFunction(view.dispatch)).toBe(true);
  });

  it('should render a simple React component', () => {
    const TestComponent = () => {
      return React.createElement('div', { 'data-testid': 'test' }, 'Test Component');
    };
    
    render(React.createElement(TestComponent));
    
    expect(screen.getByTestId('test')).toBeInTheDocument();
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});