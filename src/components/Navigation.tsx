import React from 'react';

const Navigation: React.FC = () => {
  const scrollTo = (pageIndex: number) => {
    window.dispatchEvent(new CustomEvent('scroll-to', { detail: pageIndex }));
  };

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <img src="/logo_immblend.svg" alt="Immblend Logo" style={{ height: '32px' }} />
      </div>
      
      <div className="nav-links">
        <button onClick={() => scrollTo(3.0)} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Produkt</button>
        <button onClick={() => scrollTo(10.0)} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Anwendungen</button>
        <button onClick={() => scrollTo(18.5)} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Highlights</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-uber-uns-modal'))} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Über uns</button>
      </div>
      
      <button onClick={() => window.dispatchEvent(new CustomEvent('open-contact-modal'))} className="nav-cta">
        Demo anfragen
      </button>
    </nav>
  );
};

export default Navigation;
