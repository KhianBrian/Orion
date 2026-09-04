import "./About.css";

const About = () => {
  return (
    <div className="about-page">
      <div className="about-hero">
        <h1 className="about-title">About Orion Interface Philippines</h1>
        <p className="about-tagline">
          Appointment access designed around clear, simple steps
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
              provides a focused psychiatry appointment experience for approved Orion accounts.
            </h2>
          </div>
        </div>

        <div className="mission-section">
          <div className="mission-card card">
            <h2 className="section-title">Our Mission</h2>
            <p className="section-text">
              To make appointment booking, review, and access easy to understand.
            </p>
          </div>

          <div className="vision-card card">
            <h2 className="section-title">Our Vision</h2>
            <p className="section-text">
              To provide a calm, accessible interface for the approved psychiatry booking scope.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
