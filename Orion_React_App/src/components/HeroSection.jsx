import "./HeroSection.css";

const HeroSection = ({
  title,
  subtitle,
  quote,
  author,
  imageSrc,
  imageAlt,
  buttonText,
  buttonLink,
  gradientClass,
  imagePosition = "right",
}) => {
  const contentOrder = imagePosition === "left" ? "row-reverse" : "row";

  return (
    <div className={`hero-section ${gradientClass}`}>
      <div className="hero-container" style={{ flexDirection: contentOrder }}>
        <div className="hero-content">
          <h1 className="hero-title">{title}</h1>
          {subtitle && <h2 className="hero-subtitle">{subtitle}</h2>}
          {quote && (
            <p className="hero-quote">
              <span className="quote-text">"{quote}"</span>
              {author && <span className="quote-author"> - {author}</span>}
            </p>
          )}
          {buttonText && (
            <a href={buttonLink || "#"} className="hero-button btn btn-primary">
              {buttonText}
            </a>
          )}
        </div>

        {imageSrc && (
          <div className="hero-image">
            <img src={imageSrc} alt={imageAlt || title} />
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroSection;
