import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
});

vi.mock('./MapDashboard', () => ({
  default: ({ onBack }) => (
    <section data-testid="map-dashboard-mock">
      <h2>Mock Dashboard</h2>
      <button onClick={onBack}>Back to Landing</button>
    </section>
  ),
}));

describe('App landing flow', () => {
  it('renders key landing content', () => {
    render(<App />);

    expect(screen.getByText('Geodashboard Berbasis Web GIS')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Visualisasi & Analisis/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Visit Dashboard/i })).toBeInTheDocument();
  });

  it('opens and closes dataset modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /View Dataset/i }));
    expect(screen.getByRole('heading', { name: /Download Dataset/i })).toBeInTheDocument();
    expect(screen.getByText('data_banjir.geojson')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /×/i }));
    expect(screen.queryByRole('heading', { name: /Download Dataset/i })).not.toBeInTheDocument();
  });

  it('navigates to dashboard from Visit Dashboard button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Visit Dashboard/i }));
    expect(await screen.findByTestId('map-dashboard-mock')).toBeInTheDocument();
  });

  it('navigates to dashboard from Explore Geodashboard button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Explore Geodashboard/i }));
    expect(await screen.findByTestId('map-dashboard-mock')).toBeInTheDocument();
  });

  it('navigates to dashboard from Start Exploring button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Start Exploring/i }));
    expect(await screen.findByTestId('map-dashboard-mock')).toBeInTheDocument();
  });
});
