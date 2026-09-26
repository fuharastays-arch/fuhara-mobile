import Link from 'next/link';
import { ButtonLink } from '@/components/ui';
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A BETTER WAY TO STAY</p>
          <h1>
            Somewhere new.
            <br />
            <em>Something familiar.</em>
          </h1>
          <p className="hero-description">
            Space to settle in. Room to be yourself.
            <br />
            Discover your next home away from home.
          </p>
          <div className="hero-motto">
            <span aria-hidden="true">✳</span> Verified stays. Effortless
            comfort.
          </div>
        </div>
        <div
          className="hero-image"
          role="img"
          aria-label="A warm, thoughtfully designed living room"
        >
          <div className="photo-note">THE ART OF FEELING AT HOME</div>
          <div className="photo-caption">
            Stay a little.
            <br />
            <em>Live a little.</em>
          </div>
        </div>
      </section>
      <section className="search-section" aria-label="Find your next stay">
        <form action="/properties" className="search-form">
          <label>
            <span>WHERE TO?</span>
            <input
              name="destination"
              placeholder="City or neighbourhood"
              maxLength={80}
            />
          </label>
          <div className="search-note">
            <span>YOUR NEXT CHAPTER</span>
            <p>A weekend away. A longer stay.</p>
          </div>
          <button className="button">
            Explore stays <span aria-hidden="true">↗</span>
          </button>
        </form>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FOLLOW YOUR CURIOSITY</p>
            <h2>A change of scenery.</h2>
          </div>
          <p>
            Familiar favourites. Fresh perspectives.
            <br />
            Start with a place that feels like you.
          </p>
        </div>
        <div className="destination-grid">
          <Link
            href="/properties?destination=Abuja"
            className="destination abuja"
          >
            <span className="destination-label">THE CAPITAL, AT YOUR PACE</span>
            <div>
              <h3>Abuja</h3>
              <span>
                Find your quiet corner <b>↗</b>
              </span>
            </div>
          </Link>
          <Link
            href="/properties?destination=Lagos"
            className="destination lagos"
          >
            <span className="destination-label">
              A CITY WITH ITS OWN RHYTHM
            </span>
            <div>
              <h3>Lagos</h3>
              <span>
                Make room for possibility <b>↗</b>
              </span>
            </div>
          </Link>
        </div>
        <p className="caption">
          Destination inspiration · Explore the collection for current stays.
        </p>
      </section>
      <section className="promise section">
        <div>
          <p className="eyebrow">THE FUHARA FEELING</p>
          <h2>
            Less wondering.
            <br />
            <em>More unwinding.</em>
          </h2>
        </div>
        <div className="promise-item">
          <span>01 /</span>
          <h3>Confidence comes first.</h3>
          <p>
            We’re building a considered collection, with a verification process
            at its heart.
          </p>
        </div>
        <div className="promise-item">
          <span>02 /</span>
          <h3>Comfort, without the fuss.</h3>
          <p>
            Thoughtful spaces and a simpler way to find somewhere that fits your
            stay.
          </p>
        </div>
      </section>
      <section className="host-banner">
        <div>
          <p className="eyebrow">GOOD SPACES DESERVE GOOD COMPANY</p>
          <h2>
            Your space.
            <br />
            Someone’s favourite stay.
          </h2>
          <p>Start your hosting journey with Fuhara.</p>
          <ButtonLink href="/host">
            Discover hosting <span aria-hidden="true">↗</span>
          </ButtonLink>
        </div>
        <div className="host-art" aria-hidden="true">
          <span>
            Open doors.
            <br />
            <em>New possibilities.</em>
          </span>
        </div>
      </section>
    </>
  );
}
