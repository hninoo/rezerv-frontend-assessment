import { mythicCharacters } from "@/features/animation/animation-content";

export default function AnimationPage() {
  return (
    <main className="page page--dark">
      <section className="container hero-grid">
        <div>
          <p className="eyebrow eyebrow--gold">
            Animation Challenge
          </p>
          <h1 className="title">
            Myanmar Mythic Collectibles
          </h1>
          <p className="copy">
            A motion-first collectible page using original Myanmar-inspired character
            direction, built around a loading reveal, hero scene, and collection section.
          </p>
        </div>

        <div className="character-grid">
          {mythicCharacters.map((character) => (
            <article
              className="character-card"
              key={character.id}
            >
              <h2>{character.name}</h2>
              <p>{character.role}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
