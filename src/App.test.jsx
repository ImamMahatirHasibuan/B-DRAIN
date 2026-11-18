// Pengujian alur landing page (App) menggunakan Vitest dan React Testing Library.
// Cakupan: render konten utama, membuka dan menutup modal dataset, serta navigasi ke dashboard.
import { cleanup, render, screen, within } from '@testing-library/react';
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
    expect(screen.getByRole('heading', { name: 'data_banjir.geojson' })).toBeInTheDocument();

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

  // Memastikan tautan kontak GitHub, Email, dan LinkedIn terpasang secara fungsional.
  it('renders functional GitHub, Email, and LinkedIn contact links', () => {
    render(<App />);

    // Tautan GitHub di navbar
    const navGithubLink = screen.getByRole('link', { name: /Repository GitHub B-DRAIN/i });
    expect(navGithubLink).toHaveAttribute('href', 'https://github.com/ImamMahatirHasibuan/B-DRAIN');
    expect(navGithubLink).toHaveAttribute('target', '_blank');

    // Tautan GitHub di footer
    const footerGithubLink = screen.getByRole('link', { name: /GitHub Repository B-DRAIN/i });
    expect(footerGithubLink).toHaveAttribute('href', 'https://github.com/ImamMahatirHasibuan/B-DRAIN');

    // Tautan Email di footer
    const footerEmailLink = screen.getByRole('link', { name: /Kirim Email ke Imam Mahatir Hasibuan/i });
    expect(footerEmailLink).toHaveAttribute('href', 'mailto:imamahatir@gmail.com');

    // Tautan LinkedIn di footer
    const footerLinkedinLink = screen.getByRole('link', { name: /Profil LinkedIn Imam Mahatir Hasibuan/i });
    expect(footerLinkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/in/imam-mahatir-hasibuan-75169a2a8');
    expect(footerLinkedinLink).toHaveAttribute('target', '_blank');
  });

  // Membuka lightbox saat foto galeri diklik, navigasi next/prev, lalu menutupnya.
  it('opens, navigates, and closes photo lightbox modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Klik foto utama
    const mainPhoto = screen.getByRole('button', { name: /Buka foto utama di lightbox/i });
    await user.click(mainPhoto);

    // Lightbox terbuka
    const dialog = screen.getByRole('dialog', { name: /Lightbox Foto Dokumentasi/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Foto 1 dari 7/i)).toBeInTheDocument();

    // Klik tombol foto berikutnya
    await user.click(within(dialog).getByRole('button', { name: /Foto berikutnya/i }));
    expect(within(dialog).getByText(/Foto 2 dari 7/i)).toBeInTheDocument();

    // Klik tombol foto sebelumnya
    await user.click(within(dialog).getByRole('button', { name: /Foto sebelumnya/i }));
    expect(within(dialog).getByText(/Foto 1 dari 7/i)).toBeInTheDocument();

    // Tutup lightbox
    await user.click(within(dialog).getByRole('button', { name: /Tutup preview foto/i }));
    expect(screen.queryByRole('dialog', { name: /Lightbox Foto Dokumentasi/i })).not.toBeInTheDocument();
  });

  // Membuka dan menutup mobile navigation menu.
  it('opens and closes mobile navigation menu', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Buka menu mobile
    const toggleBtn = screen.getByRole('button', { name: /Buka navigasi/i });
    await user.click(toggleBtn);

    // Menu mobile terbuka
    expect(screen.getByRole('button', { name: /^Tutup navigasi$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tutup navigasi mobile/i })).toBeInTheDocument();

    // Tutup menu mobile
    await user.click(screen.getByRole('button', { name: /Tutup navigasi mobile/i }));
    expect(screen.queryByRole('button', { name: /Tutup navigasi mobile/i })).not.toBeInTheDocument();
  });
});
