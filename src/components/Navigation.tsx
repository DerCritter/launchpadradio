import React from 'react';

const Navigation: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="nav-logo">MOLTEN</div>
      
      <div className="nav-links">
        <a href="#produkt" className="nav-link">Produkt</a>
        <a href="#anwendungen" className="nav-link">Anwendungen</a>
        <a href="#business" className="nav-link">Business</a>
        <a href="#uber-uns" className="nav-link">Über uns</a>
      </div>
      
      <button className="nav-cta">
        Demo anfragen
      </button>
    </nav>
  );
};

export default Navigation;
