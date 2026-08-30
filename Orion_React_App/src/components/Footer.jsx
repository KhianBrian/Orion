import "./Footer.css";

const Footer = () => {
  return (
    <footer className="orion-footer">
      <div className="footer-content">
        <p className="footer-copyright">
          © 2025 Orion Interface Philippines, Inc. &nbsp;&nbsp;&nbsp; All rights
          reserved under Albetros Philippines, Inc.
        </p>
        <p className="footer-social-text">Follow us on social media:</p>

        <div className="footer-links">
          <a
            href="https://www.facebook.com/profile.php?viewas=100000686899395&id=61573787343857"
            className="footer-link-social"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/images/fb.jpg" alt="Facebook" />
          </a>
          <a href="#" className="footer-link-social">
            <img src="/images/ig.jpg" alt="Instagram" />
          </a>

          <button className="footer-link">FAQ</button>
          <button className="footer-link">Privacy Policy</button>
          <button className="footer-link">Terms of Service</button>
          <button className="footer-link">Careers</button>
          <button className="footer-link">Support</button>
          <button className="footer-link">Sitemap</button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
