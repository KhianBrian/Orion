import "./About.css";

const About = () => {
  return (
    <div className="about-page">
      <div className="about-hero">
        <h1 className="about-title">About Orion Interface Philippines</h1>
        <p className="about-tagline">
          Guiding the Filipino Youth to Greater Futures
        </p>
      </div>

      <div className="about-content">
        <div className="founder-card card">
          <div className="founder-image-container">
            <img
              src="/images/maammarwen.jpeg"
              alt="Marwen A. Casteñada - Founder"
              className="founder-image"
            />
          </div>

          <div className="founder-info">
            <h2 className="founder-heading">
              <strong className="company-name">
                "Orion Interface Philippines, Inc."
              </strong>{" "}
              is a brain child of{" "}
              <strong className="founder-name">"Marwen A. Casteñada"</strong>{" "}
              who founded the institution in order to provide right guidance for
              the assets of the nation{" "}
              <strong className="youth-emphasis">"The Filipino Youth"</strong>
            </h2>
          </div>
        </div>

        <div className="mission-section">
          <div className="mission-card card">
            <h2 className="section-title">Our Mission</h2>
            <p className="section-text">
              To empower individuals through comprehensive guidance and
              counseling services, helping them discover their true potential
              and navigate their career paths with confidence.
            </p>
          </div>

          <div className="vision-card card">
            <h2 className="section-title">Our Vision</h2>
            <p className="section-text">
              To be the leading guidance and career counseling institution in
              the Philippines, shaping futures and creating opportunities for
              every Filipino youth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
