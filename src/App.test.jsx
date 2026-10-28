// Pengujian alur landing page (App) menggunakan Vitest dan React Testing Library.
// Cakupan: render konten utama, membuka dan menutup modal dataset, serta navigasi ke dashboard.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// Membersihkan DOM setelah setiap test agar render antar test tidak saling memengaruhi.
afterEach(() => {
  cleanup();
});

// Mock MapDashboard: komponen peta yang berat diganti stub sederhana berupa section dengan tombol "Back to Landing" (memanggil onBack).
// vi.mock di-hoist oleh Vitest, sehingga mock berlaku sebelum App di-import.
vi.mock('./MapDashboard', () => ({
  default: ({ onBack }) => (
    <section data-testid="map-dashboard-mock">
      <h2>Mock Dashboard</h2>
      <button onClick={onBack}>Back to Landing</button>
    </section>
  ),
}));

describe('App landing flow', () => {
  // Memastikan tagline, heading utama, dan tombol Visit Dashboard tampil saat render awal.
  it('renders key landing content', () => {
    render(<App />);

    expect(screen.getByText('Geodashboard Berbasis Web GIS')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Visualisasi & Analisis/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Visit Dashboard/i })).toBeInTheDocument();
  });

  // Membuka modal View Dataset, memastikan item data_banjir.geojson tampil, lalu menutup modal lewat tombol ×.
  it('opens and closes dataset modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /View Dataset/i }));
    expect(screen.getByRole('heading', { name: /Download Dataset/i })).toBeInTheDocument();
    expect(screen.getByText('data_banjir.geojson')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /×/i }));
    expect(screen.queryByRole('heading', { name: /Download Dataset/i })).not.toBeInTheDocument();
  });

  // Klik tombol Visit Dashboard di navbar harus menampilkan stub MapDashboard.
  it('navigates to dashboard from Visit Dashboard button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Visit Dashboard/i }));
    expect(await screen.findByTestId('map-dashboard-mock')).toBeInTheDocument();
  });

  // Klik tombol Explore Geodashboard di hero harus menampilkan stub MapDashboard.
  it('navigates to dashboard from Explore Geodashboard button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Explore Geodashboard/i }));
    expect(await screen.findByTestId('map-dashboard-mock')).toBeInTheDocument();
  });

  // Klik tombol Start Exploring di section Data harus menampilkan stub MapDashboard.
  it('navigates to dashboard from Start Exploring button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Start Exploring/i }));
    expect(await screen.findByTestId('map-dashboard-mock')).toBeInTheDocument();
  });
});
