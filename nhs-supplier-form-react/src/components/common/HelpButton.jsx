/**
 * HelpButton Component
 * Floating help button that provides links to support resources
 */

import { useState } from 'react';
import './HelpButton.css';

const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const helpLinks = [
    {
      label: 'Procurement Helpdesk',
      url: 'https://servicedeskbartshealth.alembacloud.com/production/Portal.aspx?Form=Dashboard&DATABASE=Production&JAVA_FLAG=1&PORTAL=procurement&HTML_TYPE=LITE',
      icon: '🎫',
      external: true,
    },
    {
      label: 'FAQ & Guidance',
      url: '/help/faq',
      icon: '❓',
      external: false,
      newTab: true,
    },
  ];

  return (
    <div className="help-button-container">
      <button
        className={`help-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Get help"
      >
        {isOpen ? '✕' : '?'}
      </button>

      {isOpen && (
        <div className="help-menu">
          <h4>Need Help?</h4>
          {helpLinks.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target={link.url.startsWith('http') || link.newTab ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="help-link"
            >
              <span className="help-icon">{link.icon}</span>
              <span>{link.label}</span>
              {link.external && <span className="external-icon">↗</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default HelpButton;
