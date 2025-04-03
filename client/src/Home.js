import React from 'react';
import './Home.css';

function Home() {
  return (
    <main>
      <div className="hero">
        <video autoPlay loop muted playsInline>
          <source src="/media/videos/placeholder.mp4" type="video/mp4" />
          {/* TODO: Add up to 10 clips, cycle via JS in My Account upload form */}
        </video>
        <p>Up to 10 short clips will cycle here (managed via My Account later).</p>
      </div>
      <div className="categories">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="category-card">
            <div className="card-placeholder"></div>
            <h3>Category {i + 1}</h3>
          </div>
        ))}
      </div>
    </main>
  );
}

export default Home;