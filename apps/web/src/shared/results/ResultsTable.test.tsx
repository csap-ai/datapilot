import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsTable } from './ResultsTable';

describe('ResultsTable', () => {
  it('renders column headers', () => {
    render(<ResultsTable columns={['id', 'name']} rows={[['1', 'alice']]} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
  });

  it('renders row cells', () => {
    render(<ResultsTable columns={['id', 'name']} rows={[['1', 'alice'], ['2', 'bob']]} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('shows row count', () => {
    render(<ResultsTable columns={['x']} rows={[['1'], ['2'], ['3']]} />);
    expect(screen.getByText(/3 行/)).toBeInTheDocument();
  });

  it('shows duration when provided', () => {
    render(<ResultsTable columns={['x']} rows={[['1']]} durationMs={123} />);
    expect(screen.getByText(/123 ms/)).toBeInTheDocument();
  });

  it('renders empty state with 0 rows and disabled export buttons', () => {
    render(<ResultsTable columns={['x']} rows={[]} />);
    expect(screen.getByText(/0 行/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CSV/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /JSON/i })).toBeDisabled();
  });

  it('hides pagination when total fits on a single page', () => {
    render(<ResultsTable columns={['x']} rows={[['1']]} pageSize={10} />);
    expect(screen.queryByText(/第 .* 页/)).not.toBeInTheDocument();
  });

  it('shows pagination controls when total exceeds page size', () => {
    const rows = Array.from({ length: 15 }, (_, i) => [String(i)]);
    render(<ResultsTable columns={['x']} rows={rows} pageSize={10} />);
    expect(screen.getByText(/第 1 \/ 2 页/)).toBeInTheDocument();
  });
});
