import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/authContext";
import "./Home.css";

const offerings = [
  { title: "Well-being & Counseling", action: "Learn more", description: "Let's talk. Team Orion listens.", quote: "Helping John see through himself in order that he may see himself through.", image: "/images/AnnexB.png", imageAlt: "A counselor listening to a young person", className: "home-offering--counseling" },
  { title: "Practice Job Interview & Skills Matching", action: "Read more", description: "Let's talk, Team Orion evaluates.", quote: "Opportunities don't find you, you have to find your opportunities.", image: "/images/Orion earth.png", imageAlt: "The Earth viewed from space", className: "home-offering--career" },
  { title: "Trainings & Consultations", action: "Read more", description: "Let's talk, Team Orion conducts.", quote: "No one can whistle a symphony. It takes an orchestra to play.", image: "/images/Lead.avif", imageAlt: "A team being guided toward a shared goal", className: "home-offering--training" },
];

const Home = () => {
  const { status } = useAuth();
  const accountPath = status === "signedIn" ? "/app" : "/login";

  return (
    <div className="home-page">
      <section className="home-intro" aria-labelledby="home-intro-title">
        <p className="home-kicker">Orion Interface Philippines</p>
        <h1 id="home-intro-title">Guiding Potentials, Shaping Futures</h1>
        <p className="home-intro__subline">A pioneer of guidance and career counseling, for a greater tomorrow.</p>
      </section>
      <section className="home-offerings" aria-label="Orion services">
        {offerings.map((offering, index) => (
          <article className={`home-offering ${offering.className}`} key={offering.title}>
            <div className="home-offering__copy">
              <p className="home-offering__index">0{index + 1} / Orion services</p>
              <h2>{offering.title}</h2>
              <p className="home-offering__description">{offering.description}</p>
              <p className="home-offering__quote">“{offering.quote}”</p>
              <Link className="home-offering__link" to={offering.title === "Well-being & Counseling" ? "/services" : accountPath}>
                {offering.action}<span aria-hidden="true"> →</span>
              </Link>
            </div>
            <div className="home-offering__image-wrap"><img src={offering.image} alt={offering.imageAlt} loading={index === 0 ? "eager" : "lazy"} /></div>
          </article>
        ))}
      </section>
      <section className="home-callout" aria-labelledby="home-callout-title">
        <p className="home-kicker">A calm next step</p>
        <h2 id="home-callout-title">Ready to start a conversation?</h2>
        <p>Explore the support that fits your circumstances, then connect with Team Orion when you are ready.</p>
        <Link className="home-callout__link" to={status === "signedIn" ? "/app" : "/services"}>{status === "signedIn" ? "Go to your account" : "Explore counseling"}</Link>
      </section>
    </div>
  );
};

export default Home;
