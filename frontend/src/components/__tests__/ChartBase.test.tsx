import React from 'react';
import { render, screen } from '@testing-library/react';
import ChartBase from '../ChartBase';

describe('ChartBase', () => {
  it('renders with title', () => {
    render(
      <ChartBase title="Test Chart">
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    const region = screen.getByRole('region', { name: 'Test Chart' });
    expect(region).toBeInTheDocument();
  });

  it('renders SVG with correct viewBox', () => {
    const { container } = render(
      <ChartBase title="Test Chart" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="50" />
      </ChartBase>
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 200 200');
  });

  it('renders children SVG elements', () => {
    const { container } = render(
      <ChartBase title="Test Chart">
        <circle cx="50" cy="50" r="40" data-testid="test-circle" />
      </ChartBase>
    );

    const circle = container.querySelector('[data-testid="test-circle"]');
    expect(circle).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(
      <ChartBase title="Test Chart" isLoading={true}>
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    render(
      <ChartBase title="Test Chart" error="Failed to load data">
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('hides SVG when loading', () => {
    const { container } = render(
      <ChartBase title="Test Chart" isLoading={true}>
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('hides SVG when error', () => {
    const { container } = render(
      <ChartBase title="Test Chart" error="Error">
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('includes description in accessibility tree', () => {
    render(
      <ChartBase title="Test Chart" description="This is a test chart">
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    const description = screen.getByText('This is a test chart');
    expect(description).toHaveClass('sr-only');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChartBase title="Test Chart" className="custom-class">
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    const chartBase = container.querySelector('.chart-base');
    expect(chartBase).toHaveClass('custom-class');
  });

  it('calls onReady callback when ready', () => {
    const onReady = jest.fn();
    render(
      <ChartBase title="Test Chart" onReady={onReady}>
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    expect(onReady).toHaveBeenCalled();
  });

  it('does not call onReady when loading', () => {
    const onReady = jest.fn();
    render(
      <ChartBase title="Test Chart" isLoading={true} onReady={onReady}>
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    expect(onReady).not.toHaveBeenCalled();
  });

  it('does not call onReady when error', () => {
    const onReady = jest.fn();
    render(
      <ChartBase title="Test Chart" error="Error" onReady={onReady}>
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    expect(onReady).not.toHaveBeenCalled();
  });

  it('supports custom width and height', () => {
    const { container } = render(
      <ChartBase title="Test Chart" width={500} height={400} responsive={false}>
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '500');
    expect(svg).toHaveAttribute('height', '400');
  });

  it('has proper ARIA attributes', () => {
    const { container } = render(
      <ChartBase title="Test Chart" description="Test description">
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Test Chart');
  });

  it('preserves aspect ratio', () => {
    const { container } = render(
      <ChartBase title="Test Chart" aspectRatio={16 / 9}>
        <circle cx="50" cy="50" r="40" />
      </ChartBase>
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  });
});
