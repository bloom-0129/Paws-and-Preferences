// ===== Config =====
const TOTAL_CATS = 12;

// ===== State =====
let cats = [];
let currentIndex = 0;
let likedCats = [];

let startX = 0;
let currentX = 0;
let isDragging = false;

// ===== DOM refs =====
const screens = {
  welcome: document.getElementById("welcome-screen"),
  swipe: document.getElementById("swipe-screen"),
  summary: document.getElementById("summary-screen"),
};

const startBtn = document.getElementById("start-btn");

const catCard = document.getElementById("cat-card");
const catImage = document.getElementById("cat-image");
const catName = document.getElementById("cat-name");
const catVibe = document.getElementById("cat-vibe");
const catTags = document.getElementById("cat-tags");
const catCounter = document.getElementById("cat-counter");

const likeBtn = document.getElementById("like-btn");
const dislikeBtn = document.getElementById("dislike-btn");

const badgeLike = catCard.querySelector(".badge--like");
const badgeNope = catCard.querySelector(".badge--nope");

const summaryIntro = document.getElementById("summary-intro");
const summaryContent = document.getElementById("summary-content");
const summaryCount = document.getElementById("summary-count");
const likedGrid = document.getElementById("liked-grid");
const summaryClose = document.getElementById("summary-close");

const loadingOverlay = document.getElementById("loading-overlay");
const tutorialOverlay = document.getElementById("tutorial-overlay");

// ===== Tutorial Close Button =====
let closeBtn = document.createElement("div");
closeBtn.classList.add("tutorial-close");
closeBtn.innerHTML = "✕";
tutorialOverlay.appendChild(closeBtn);

// ===== Utilities =====
function switchScreen(target) {
  Object.values(screens).forEach((s) => s.classList.remove("screen--active"));
  screens[target].classList.add("screen--active");
}

// cute random vibes + tags
const vibes = [
  "Sleepy loaf",
  "Chaos gremlin",
  "Soft and shy",
  "Zoomies expert",
  "Couch potato",
  "Midnight singer",
  "Little stalker"
];

const tagPool = [
  "Cuddle bug",
  "Window watcher",
  "Treat lover",
  "Laser chaser",
  "Box enthusiast",
  "Purr machine",
  "Chair thief",
  "Nap master",
  "Sunbeam seeker",
  "Tiny tornado" 
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTags(count = 3) {
  return [...tagPool].sort(() => Math.random() - 0.5).slice(0, count);
}

// ===== Fetch Cats =====
async function fetchCats() {
  try {
    const res = await fetch(`https://cataas.com/api/cats?limit=${TOTAL_CATS}`);
    if (!res.ok) throw new Error("Cataas API error");

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Empty API");

    cats = data.slice(0, TOTAL_CATS).map((c, index) => {
      const id = c._id;

      return {
        id,
        imageUrl: id
          ? `https://cataas.com/cat/${id}?width=600&height=600&random=${Math.random()}`
          : `https://cataas.com/cat?width=600&height=600&random=${Math.random()}`,
        name: `Kitty #${index + 1}`,
        vibe: randomFrom(vibes),
        tags: randomTags(4)
      };
    });
  } catch (err) {
    console.warn("Cataas failed → fallback cats", err);

    cats = Array.from({ length: TOTAL_CATS }, (_, i) => ({
      id: i,
      imageUrl: `https://cataas.com/cat?width=600&height=600&random=${Date.now() + i}`,
      name: `Kitty #${i + 1}`,
      vibe: randomFrom(vibes),
      tags: randomTags(3),
    }));
  }
}

// ===== Preload Images =====
async function preloadImages() {
  const loaders = cats.map(
    (c) =>
      new Promise((resolve) => {
        const img = new Image();
        img.src = c.imageUrl;
        img.onload = resolve;
        img.onerror = resolve;
      })
  );

  // ensure first cat loads before screen transition
  await loaders[0];

  // preload rest in background
  loaders.forEach((p) => p.catch(() => {}));
}

// ===== Rendering =====
function updateCounter() {
  catCounter.textContent = `Cat ${currentIndex + 1} of ${cats.length}`;
}

function renderCurrentCat() {
  const cat = cats[currentIndex];
  if (!cat) return;

  // reset position
  catCard.style.transform = "translateX(0) rotate(0deg)";
  badgeLike.style.opacity = 0;
  badgeNope.style.opacity = 0;

  catImage.src = cat.imageUrl;
  catName.textContent = cat.name;
  catVibe.textContent = cat.vibe;

  catTags.innerHTML = "";
  cat.tags.forEach((tag) => {
    const li = document.createElement("li");
    li.textContent = tag;
    catTags.appendChild(li);
  });

  updateCounter();
}

// ===== Swipe logic =====
function onGestureStart(e) {
  isDragging = true;
  startX = e.touches?.[0]?.clientX || e.clientX;
  currentX = startX;

  catCard.classList.add("dragging");
}

function onGestureMove(e) {
  if (!isDragging) return;

  currentX = e.touches?.[0]?.clientX || e.clientX;
  const deltaX = currentX - startX;
  const rotation = deltaX / 18;

  catCard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

  const opacity = Math.min(Math.abs(deltaX) / 100, 1);

  if (deltaX > 0) {
    badgeLike.style.opacity = opacity;
    badgeNope.style.opacity = 0;
  } else {
    badgeNope.style.opacity = opacity;
    badgeLike.style.opacity = 0;
  }
}

function onGestureEnd() {
  if (!isDragging) return;

  isDragging = false;
  catCard.classList.remove("dragging");

  const deltaX = currentX - startX;

  if (deltaX > 80) return handleChoice(true);
  if (deltaX < -80) return handleChoice(false);

  // reset (weak swipe)
  catCard.classList.add("shake");
  resetCardPosition();
  setTimeout(() => catCard.classList.remove("shake"), 300);
}

function resetCardPosition() {
  catCard.style.transition = "transform .45s ease";
  catCard.style.transform = "translateX(0) rotate(0)";
  setTimeout(() => (catCard.style.transition = "none"), 450);
}

function handleChoice(liked) {
  const cat = cats[currentIndex];

  const offscreenX = liked ? window.innerWidth : -window.innerWidth;
  catCard.style.transition = "transform .7s ease-out";
  catCard.style.transform = `translateX(${offscreenX}px) rotate(${liked ? 14 : -14}deg)`;

  if (liked) likedCats.push(cat);

  setTimeout(() => {
    currentIndex++;
    catCard.style.transition = "none";

    if (currentIndex < cats.length) {
      renderCurrentCat();
    } else {
      showSummary();
    }
  }, 400);
}

// ===== Summary =====
async function showSummary() {
  switchScreen("summary");

  summaryIntro.classList.add("hidden");
  summaryContent.classList.add("hidden");
  likedGrid.innerHTML = "";

  // show loading spinner
  const loader = document.getElementById("summary-loading");
  loader.classList.remove("hidden");

  // Wait for liked kitties to load
  await Promise.all(
    likedCats.map(cat => {
      return new Promise(resolve => {
        const img = new Image();
        img.src = cat.imageUrl;
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  // hide loader
  loader.classList.add("hidden");

  // show summary content
  summaryContent.classList.remove("hidden");

  summaryCount.textContent =
    likedCats.length === 0
      ? "You didn’t like any cats this round."
      : `You liked ${likedCats.length} out of ${cats.length} cats.`;

  likedCats.forEach(cat => {
    const tile = document.createElement("div");
    tile.className = "liked-tile";
    tile.innerHTML = `
      <img src="${cat.imageUrl}" alt="${cat.name}">
      <div class="liked-tile-caption">${cat.name}</div>
    `;
    likedGrid.appendChild(tile);
  });
}

// ===== Start Btn =====
startBtn.addEventListener("click", async () => {
  loadingOverlay.classList.add("active");

  await fetchCats();
  await preloadImages();

  loadingOverlay.classList.remove("active");
  switchScreen("swipe");

  tutorialOverlay.classList.add("active");

  currentIndex = 0;
  likedCats = [];
  renderCurrentCat();
});

// ===== Tutorial Close =====
closeBtn.addEventListener("click", () => {
  tutorialOverlay.classList.remove("active");
});
tutorialOverlay.addEventListener("click", () => {
  tutorialOverlay.classList.remove("active");
});

// ===== Buttons =====
likeBtn.addEventListener("click", () => handleChoice(true));
dislikeBtn.addEventListener("click", () => handleChoice(false));

// ===== Touch Events =====
catCard.addEventListener("touchstart", onGestureStart, { passive: true });
catCard.addEventListener("touchmove", onGestureMove, { passive: true });
catCard.addEventListener("touchend", onGestureEnd);

// ===== Mouse Events =====
catCard.addEventListener("mousedown", (e) => {
  e.preventDefault();
  onGestureStart(e);
});
window.addEventListener("mousemove", onGestureMove);
window.addEventListener("mouseup", onGestureEnd);

// ===== Summary Close =====
summaryClose.addEventListener("click", () => window.location.reload());


