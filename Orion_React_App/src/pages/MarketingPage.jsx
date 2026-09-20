import { Link } from "react-router-dom";
import "./MarketingPage.css";

const content = {
  contact: { eyebrow: "Contact Orion", title: "We are here to help", text: "Have a question about booking, sessions, or our services? Reach out and our team will respond during business hours.", details: ["Email: hello@orioninterface.ph", "Phone: +63 917 123 4567", "Hours: Monday–Friday, 9:00 AM–5:00 PM"] },
  portfolio: { eyebrow: "Our work", title: "Programs built around people", text: "Orion partners with individuals, schools, and organizations to create practical guidance programs that support growth.", details: ["Individual guidance programs", "School and youth initiatives", "Workplace consultations"] },
  blog: { eyebrow: "Orion stories", title: "Experiences and reflections", text: "Read reflections from the Orion community. Patient-submitted experiences are reviewed before they are published.", details: ["“The booking process was easy to follow.” — Maria L.", "“I felt heard and supported.” — Jon R."] },
};

const benefitCards = [
  ["Addressing Emotional and Mental Health Concerns", "Counseling helps individuals understand and manage their emotions, including those related to anxiety, depression, and other mental health conditions.", "It provides a safe space to explore difficult experiences and develop healthy coping mechanisms."],
  ["Enhancing Personal Growth and Self-Awareness", "Counseling facilitates self-reflection and exploration, allowing individuals to identify their strengths, weaknesses, and values.", "It can empower individuals to set goals and work toward positive change."],
  ["Improving Relationships and Communication", "Counseling can improve communication skills, allowing individuals to express their needs and perspectives more effectively.", "It can help people navigate conflict and strengthen relationships with family, friends, and partners."],
  ["Addressing Life Transitions and Challenges", "Counseling can be particularly helpful during times of major life changes, such as job loss, divorce, or grief.", "It provides support and guidance for navigating challenging situations and developing resilience."],
  ["Building a Foundation for Well-being", "Counseling can help individuals develop a sense of purpose and meaning in their lives.", "It can foster a more positive outlook and promote healthy behaviors that reduce stress."],
];

function CounselingPage() {
  return (
    <div className="counseling-page">
      <section className="counseling-intro" aria-labelledby="counseling-title">
        <p className="counseling-kicker">Orion well-being services</p>
        <h1 id="counseling-title">Well-being &amp; Counseling</h1>
        <p className="counseling-intro__tagline">“Guiding potential, shaping futures”</p>
        <p className="counseling-intro__subline">A pioneer of guidance and career counseling, for a greater tomorrow.</p>
      </section>
      <section className="counseling-panel counseling-panel--listen" aria-labelledby="listen-title">
        <div><p className="counseling-panel__eyebrow">01 / A listening space</p><h2 id="listen-title">Let's talk. Team Orion listens.</h2><p>We provide support in exploring better possibilities while navigating your current life circumstances in order to attain personal, social, and mental well-being.</p><p>Team Orion is a dynamic group of mental health professionals dedicated to supporting individuals in their pursuit of holistic well-being.</p></div>
        <img src="/images/AnnexA.png" alt="A counselor supporting a young person" />
      </section>
      <section className="counseling-panel counseling-panel--approach" aria-labelledby="approach-title">
        <img src="/images/AnnexC.png" alt="A person speaking with a counselor by video" loading="lazy" />
        <div><p className="counseling-panel__eyebrow">02 / How we work</p><h2 id="approach-title">Our approach</h2><p><strong>Client centered.</strong> Customized counseling techniques according to the client&apos;s specific challenges.</p><p>Human-to-human interaction using video conferencing and face-to-face sessions depending upon client request and case-by-case evaluation.</p></div>
      </section>
      <section className="counseling-benefits" aria-labelledby="benefits-title">
        <p className="counseling-panel__eyebrow">03 / Why counseling matters</p><h2 id="benefits-title">Benefits of Professional Counseling</h2>
        <p className="counseling-benefits__lead">Counseling provides a safe and supportive space for individuals to explore their feelings, thoughts, and behaviors, leading to personal growth, improved mental health, and enhanced coping skills.</p>
        <div className="counseling-benefits__grid">{benefitCards.map(([title, first, second], index) => <article className={`benefit-card benefit-card--${index + 1}`} key={title}><h3>{index + 1}. {title}</h3><p>▸ {first}</p><p>▸ {second}</p></article>)}</div>
        <p className="counseling-benefits__summary">In summary, counseling gives people the tools and support they need to navigate life&apos;s challenges, improve their mental health, and achieve personal growth in a compassionate and professional manner.</p>
      </section>
      <section className="counseling-cta" aria-label="Book a counseling session"><h2>Take the next step at your own pace.</h2><p>When you are ready, sign in to access Orion&apos;s appointment tools.</p><Link to="/login">Sign in to Orion <span aria-hidden="true">→</span></Link></section>
    </div>
  );
}

export default function MarketingPage({ type }) {
  if (type === "services") return <CounselingPage />;
  const page = content[type];
  return <section className="marketing-page"><p className="eyebrow">{page.eyebrow}</p><h1>{page.title}</h1><p className="marketing-lead">{page.text}</p><div className="marketing-details">{page.details.map((detail) => <div key={detail}>{detail}</div>)}</div><Link to="/login" className="ui-button ui-button--primary">Sign in to Orion</Link></section>;
}
