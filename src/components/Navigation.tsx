import React from 'react';

const Navigation: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const handleVisibility = (e: any) => {
      setIsVisible(e.detail.visible);
    };
    window.addEventListener('navbar-visibility', handleVisibility);
    return () => window.removeEventListener('navbar-visibility', handleVisibility);
  }, []);

  const scrollTo = (pageIndex: number) => {
    window.dispatchEvent(new CustomEvent('scroll-to', { detail: pageIndex }));
  };

  return (
    <nav className={`navbar ${!isVisible ? 'navbar--hidden' : ''}`}>
      <div className="nav-logo">
        <img src="/logo_immblend.svg" alt="Immblend Logo" style={{ height: '32px' }} />
      </div>
      
      <div className="nav-actions">
        <div className="nav-links">
          <button onClick={() => scrollTo(3.0)} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Produkt</button>
          <button onClick={() => scrollTo(10.0)} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Anwendungen</button>
          <button onClick={() => scrollTo(18.5)} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Highlights</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('open-uber-uns-modal'))} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Über uns</button>
        </div>
        
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-contact-modal'))} className="nav-cta">
          Demo anfragen
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
