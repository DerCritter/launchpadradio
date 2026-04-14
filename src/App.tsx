import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Visualizer3D from './components/Visualizer3D';

const ContactModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-contact-modal', handleOpen);
    return () => window.removeEventListener('open-contact-modal', handleOpen);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Anti-spam encoding standard trick
    const u = 'info';
    const d = 'immblend.de';
    window.location.href = `mailto:${u}@${d}?subject=Demo Anfrage`;
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
      <div className="contact-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setIsOpen(false)}>&times;</button>
        <h2>Demo anfragen</h2>
        <p style={{ marginBottom: "1rem" }}>Hinterlassen Sie uns eine Nachricht und wir melden uns umgehend bei Ihnen.</p>
        <p style={{ color: "#8b5cf6", fontSize: "0.9rem", marginBottom: "2rem", fontWeight: 600 }}>Direktkontakt: info@immblend.de</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" required placeholder="Ihr Name" />
          </div>
          <div className="form-group">
            <label>Unternehmen</label>
            <input type="text" required placeholder="Ihr Unternehmen" />
          </div>
          <div className="form-group">
            <label>Nachricht</label>
            <textarea placeholder="Wie können wir Ihnen helfen?" required></textarea>
          </div>
          <button type="submit" className="modal-submit">Anfrage senden</button>
        </form>
      </div>
    </div>
  );
};

const UberUnsModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-uber-uns-modal', handleOpen);
    return () => window.removeEventListener('open-uber-uns-modal', handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
      <div className="contact-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setIsOpen(false)}>&times;</button>
        <h2>ImmBlend GmbH</h2>
        <div style={{ margin: "1.5rem 0", color: "#cbd5e1", lineHeight: 1.8 }}>
          <p style={{ marginBottom: "1rem", color: "white" }}><strong>Deutschlands führende AR VR Agentur.</strong></p>
          <p style={{ marginBottom: "1rem" }}>Hinter diesem innovativen Projekt steht die ImmBlend GmbH. Wir entwickeln maßgeschneiderte Lösungen in den Bereichen Virtual Reality, Augmented Reality, künstliche Intelligenz und Metaversen.</p>
          <p>Unser erfahrenes Team aus Spezialisten berät Sie auf strategischer Ebene und begleitet Sie von der Konzeption immersiver Welten bis hin zu NEWERA Trainings in unserer hauseigenen Academy.</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="modal-submit">Zurück zum Erlebnis</button>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="app-main">
      <Navigation />
      <Visualizer3D />
      <ContactModal />
      <UberUnsModal />
    </div>
  );
}

export default App;
