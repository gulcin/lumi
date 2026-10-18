const base = import.meta.env.BASE_URL;

export function artSrc(name: string, scale: 1 | 2 = 1): string {
  const file = scale === 2 ? `${name}@2x.webp` : `${name}.webp`;
  return `${base}art/${file}`;
}

/** Storybook painting. Decorative images pass alt="" so the nearby words stay the accessible name. */
export function Art({
  name,
  alt = "",
  className,
  eager = false,
}: {
  name: string;
  alt?: string;
  className?: string;
  eager?: boolean;
}) {
  const one = artSrc(name, 1);
  const two = artSrc(name, 2);
  return (
    <img
      className={className}
      src={one}
      srcSet={`${one} 1x, ${two} 2x`}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

export function PaintCard({
  art,
  title,
  detail,
  on,
  eager = false,
  onClick,
}: {
  art: string;
  title: string;
  detail: string;
  on?: boolean;
  eager?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={on ? "paint-card on" : "paint-card"} onClick={onClick}>
      <span className="paint-frame">
        <Art name={art} alt="" className="paint-thumb" eager={eager} />
      </span>
      <span className="paint-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
    </button>
  );
}
