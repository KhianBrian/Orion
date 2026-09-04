import { Link } from "react-router-dom";

const content = {
  contact: { eyebrow: "Contact Orion", title: "We are here to help", text: "Have a question about booking, sessions, or our services? Reach out and our team will respond during business hours.", details: ["Email: hello@orioninterface.ph", "Phone: +63 917 123 4567", "Hours: Monday–Friday, 9:00 AM–5:00 PM"] },
  services: { eyebrow: "Our services", title: "Guidance for your next step", text: "Explore counseling, career guidance, interview preparation, and consultation services designed around your goals.", details: ["Well-being and counseling", "Career guidance", "Training and consultations"] },
  portfolio: { eyebrow: "Our work", title: "Programs built around people", text: "Orion partners with individuals, schools, and organizations to create practical guidance programs that support growth.", details: ["Individual guidance programs", "School and youth initiatives", "Workplace consultations"] },
  blog: { eyebrow: "Orion stories", title: "Experiences and reflections", text: "Read reflections from the Orion community. Patient-submitted experiences are reviewed before they are published.", details: ["“The booking process was easy to follow.” — Maria L.", "“I felt heard and supported.” — Jon R."] },
};

export default function MarketingPage({ type }) {
  const page = content[type];
  return <section className="marketing-page"><p className="eyebrow">{page.eyebrow}</p><h1>{page.title}</h1><p className="marketing-lead">{page.text}</p><div className="marketing-details">{page.details.map((detail) => <div key={detail}>{detail}</div>)}</div><Link to="/patient-appointment" className="ui-button ui-button--primary">Book a Session</Link></section>;
}
