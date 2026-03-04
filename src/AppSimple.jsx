import React from 'react';
import { Droplet } from 'lucide-react';
import './App.css';

function AppSimple() {
  return (
    <div className="landing-page">
      <section className="hero-section">
        <nav className="navbar">
          <div className="nav-brand">
            <Droplet className="brand-icon" size={32} />
            <span>B-DRAIN</span>
          </div>
        </nav>
        
        <div className="hero-content">
          <div className="hero-text">
            <div className="badge">Web GIS Geodashboard</div>
            <h1>
              Visualisasi<br />
              <span className="gradient-text">Banjir & Drainase</span><br />
              Kota Bekasi
            </h1>
            <p>
              Platform sistem informasi geografis berbasis web untuk visualisasi dan analisis spasial sederhana.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AppSimple;
