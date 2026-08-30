import HeroSection from "../components/HeroSection";
import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  return (
    <div className="home-page">
      {/* Hero Banner */}
      <div className="home-hero">
        <div className="hero-text-center">
          <h1 className="hero-main-title">Orion Interface Philippines</h1>
          <p className="hero-tagline">"Guiding Potentials, Shaping Futures"</p>
          <p className="hero-subtitle">
            <em>
              "A Pioneer of Guidance and Career Counseling, for a Greater
              Tomorrow"
            </em>
          </p>
        </div>
      </div>

      {/* Section 1: Well-being & Counseling */}
      <HeroSection
        title="Well-being & Counseling"
        subtitle="Let's talk. Team Orion listens."
        quote="Helping John see through himself inorder that he may see himself through"
        author="Shirley Hamrin (1947)"
        imageSrc="/images/AnnexB.png"
        imageAlt="Counseling Services"
        buttonText="Learn more"
        buttonLink="#counseling"
        gradientClass="bg-gradient-purple-pink"
        imagePosition="right"
      />

      <section className="home-testimonials" id="testimonials">
        <div className="home-section-heading">
          <p className="eyebrow">Patient experiences</p>
          <h2>Support that helps people move forward</h2>
          <p>Read what people say about their experience with Orion.</p>
        </div>
        <div className="testimonial-grid">
          {[['Maria L.', 'The booking process was simple and easy to understand.'], ['Jon R.', 'I felt listened to and supported throughout my session.'], ['Angela D.', 'The team helped me take a clearer next step.']].map(([name, quote]) => (
            <article className="testimonial-card" key={name}><p>“{quote}”</p><strong>{name}</strong></article>
          ))}
        </div>
        <Link to="/blog" className="home-secondary-link">Read more experiences</Link>
      </section>

      {/* Section 2: Practice Job Interview & Skills Matching */}
      <HeroSection
        title="Practice Job Interview & Skills Matching"
        subtitle="Let's talk, Team Orion evaluates."
        quote="Opportunities don't find you, you have to find your opportunities."
        author="John Gokongwei Jr."
        imageSrc="/images/Orion earth.png"
        imageAlt="Job Interview Practice"
        buttonText="Read More"
        buttonLink="#interview"
        gradientClass="bg-gradient-blue-purple"
        imagePosition="left"
      />

      {/* Section 3: Trainings & Consultations */}
      <HeroSection
        title="Trainings & Consultations"
        subtitle="Let's talk, Team Orion conducts."
        quote="No one can whistle a symphony. It takes an orchestra to play."
        author="Halford E. Luccock"
        imageSrc="/images/Lead.avif"
        imageAlt="Training and Consultations"
        buttonText="Read More"
        buttonLink="#training"
        gradientClass="bg-gradient-cyan-blue"
        imagePosition="right"
      />
    </div>
  );
};

export default Home;
