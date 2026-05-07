import React, { useState, useEffect, useRef } from 'react';
import './Footer.css';

function Footer() {
  const [showSocial, setShowSocial] = useState(true);
  const [showToggle, setShowToggle] = useState(true);
  const footerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (footerRef.current) {
        const rect = footerRef.current.getBoundingClientRect();
        // Hide toggle button when footer comes into view (near bottom of viewport)
        if (rect.top < window.innerHeight) {
          setShowToggle(false);
        } else {
          setShowToggle(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return (
    <footer className="footer" ref={footerRef}>
      {/* Main Footer */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-container">
            {/* Company Info */}
            <div className="footer-section">
              <div className="footer-logo">
                <img src="/kl.png" alt="Klpro (OPC) private limited" />
                <h3>Klpro (OPC) private limited</h3>
              </div>
              <p className="footer-desc">Professional home services at your doorstep. Connecting quality professionals with customers since 2024.</p>
            </div>

            {/* Services */}
            <div className="footer-section">
              <h3>Our Services</h3>
              <ul className="footer-links">
                <li><a href="/services">HelpingHand</a></li>
                <li><a href="/services">Women's Salon & Spa</a></li>
                <li><a href="/services">Men's Salon & Massage</a></li>
                <li><a href="/services">Cleaning & Pest Control</a></li>
                <li><a href="/services">AC & Appliance Repair</a></li>
                <li><a href="/services">Electrician & Plumber & Carpenter & Mason</a></li>
                <li><a href="/services">Home Decoration</a></li>
              </ul>
            </div>

            {/* Quick Links */}
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul className="footer-links">
                <li><a href="/">Home</a></li>
                <li><a href="/services">Services</a></li>
                <li><a href="/professionals">Professionals</a></li>
                <li><a href="/bookings">My Bookings</a></li>
                <li><a href="/profile">Profile</a></li>
              </ul>
            </div>

            {/* Support */}
            <div className="footer-section">
              <h3>Support & Info</h3>
              <ul className="footer-links">
                <li><a href="/help-center" className="footer-link-btn">Help Center</a></li>
                <li><a href="/faqs" className="footer-link-btn">FAQs</a></li>
                <li><a href="/privacy-policy" className="footer-link-btn">Privacy Policy</a></li>
                <li><a href="/terms-conditions" className="footer-link-btn">Terms & Conditions</a></li>
                <li><a href="/contact" className="footer-link-btn">Contact</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="footer-section">
              <h3>Contact & Follow</h3>
              <div className="contact-info">
                <p>📧 info@klproind.com</p>
                <p>📱 +91 9711379156</p>
              </div>
              <div className="social-links-wrapper">
                <div className={`social-links ${showSocial ? 'show' : 'hide'}`}>
                  <a href="https://www.facebook.com/share/18mU5vNttH/" target="_blank" rel="noopener noreferrer" className="social-icon facebook" title="Facebook">
                    <span>f</span>
                  </a>
                  <a href="https://www.instagram.com/klprocompany/" target="_blank" rel="noopener noreferrer" className="social-icon instagram" title="Instagram">
                    <span>📷</span>
                  </a>
                  <a href="https://x.com/KLProCompany" target="_blank" rel="noopener noreferrer" className="social-icon twitter" title="Twitter">
                    <span>𝕏</span>
                  </a>
                  <a href="https://www.linkedin.com/in/kl-pro-682849404?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer" className="social-icon linkedin" title="LinkedIn">
                    <span>in</span>
                  </a>
                  <a href="https://WA.me/919711379156" target="_blank" rel="noopener noreferrer" className="social-icon whatsapp" title="WhatsApp">
                    <span>💬</span>
                  </a>
                </div>
                {showToggle && (
                  <button
                    className="social-toggle"
                    onClick={() => setShowSocial(!showSocial)}
                    title={showSocial ? 'Hide social links' : 'Show social links'}
                  >
                    {showSocial ? '−' : '+'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="container">
          <div className="footer-bottom-content">
            <p>&copy; 2024 Klpro (OPC) private limited. All rights reserved.</p>

          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
