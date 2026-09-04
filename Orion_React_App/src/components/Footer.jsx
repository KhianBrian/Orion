import "./Footer.css";

const Footer = () => {
  return (
    <footer className="orion-footer">
      <div className="footer-content">
        <p className="footer-copyright">© 2025 Orion Interface Philippines, Inc. · All rights reserved under Albetros Philippines, Inc.</p>
        <p className="footer-social-text">Follow us on social media:</p>
        <div className="footer-links">
          <a href="https://www.facebook.com/profile.php?viewas=100000686899395&id=61573787343857" className="footer-link-social" target="_blank" rel="noopener noreferrer"><img src="/images/fb.jpg" alt="Facebook" /></a>
          <a href="https://www.instagram.com/" className="footer-link-social" target="_blank" rel="noopener noreferrer"><img src="/images/ig.jpg" alt="Instagram" /></a>
          {['FAQ', 'Privacy Policy', 'Terms of Service', 'Careers', 'Support', 'Sitemap'].map((label) => <button key={label} type="button" className="footer-link">{label}</button>)}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
